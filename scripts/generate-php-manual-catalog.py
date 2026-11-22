#!/usr/bin/env python3
"""Extract editor summaries from a pinned php/doc-en source archive.

Usage: python3 scripts/generate-php-manual-catalog.py PATH/TO/doc-en.tar.gz
"""
import argparse
import json
import re
import tarfile
import xml.etree.ElementTree as ET
from pathlib import Path

REVISION = "32979f4fef992cd4cd3c7c33c4be414f86419b83"
SOURCE = f"https://github.com/php/doc-en/tree/{REVISION}"
OUTPUT = Path(__file__).resolve().parents[1] / "src/extension/phpManualCatalog.json"
DOCBOOK = "{http://docbook.org/ns/docbook}"
XML_ID = "{http://www.w3.org/XML/1998/namespace}id"
PAGE_ID = re.compile(r"[a-zA-Z0-9_.-]+")
IDENTIFIER = r"[a-zA-Z_][a-zA-Z0-9_]*"
SYMBOL = re.compile(rf"\\?{IDENTIFIER}(?:\\{IDENTIFIER})*(?:::{IDENTIFIER})?")
ENTITY = re.compile(r"&([a-zA-Z][\w.-]*);")
XML_ENTITIES = {"amp", "apos", "gt", "lt", "quot"}
MANUAL_ENTITIES = {"Alias": "Alias of", "true": "true", "false": "false",
                   "null": "null", "array": "array", "return.success": "Returns true on success or false on failure."}
UNRESOLVED = "\ufffc"
DOCUMENT_ROOT = re.compile(r'^\s*(?:(?:<\?xml.*?\?>|<!--.*?-->)\s*)*<([\w:]+)\b([^>]*)>', re.S)
NS = {"d": DOCBOOK[1:-1]}


def replace_entity(match):
    name = match[1]
    return match[0] if name in XML_ENTITIES else MANUAL_ENTITIES.get(name, UNRESOLVED)


def prose(element):
    if element is None:
        return ""
    value = " ".join("".join(element.itertext()).split())
    if UNRESOLVED in value:
        return ""
    return value if len(value) <= 600 else value[:600].rsplit(" ", 1)[0] + "…"


def first_paragraph(element):
    return next((summary for child in element if child.tag in
                 (DOCBOOK + "para", DOCBOOK + "simpara") and (summary := prose(child))), "")


def normalized_constant(name):
    owner, separator, member = name.lstrip("\\").rpartition("::")
    return owner.lower() + separator + member


def extract(root, catalog):
    page = root.get(XML_ID, "")
    if not PAGE_ID.fullmatch(page):
        return
    if root.tag == DOCBOOK + "refentry":
        shared_summary = ""
        for namediv in root.findall("d:refnamediv", NS):
            summary = prose(namediv.find("d:refpurpose", NS))
            shared_summary = shared_summary or summary
            for node in namediv.findall("d:refname", NS):
                name = prose(node)
                if SYMBOL.fullmatch(name):
                    key = name.lstrip("\\").lower()
                    # A dedicated function page takes precedence over a shared entry.
                    dedicated = page == "function." + key.replace("_", "-")
                    put(catalog, "callables", key, page, summary, 3 if dedicated else 2)
        # Some pages list the procedural spelling only in the signature.
        for name_node in root.findall("d:refsect1[@role='description']/d:methodsynopsis/d:methodname", NS):
            name = prose(name_node)
            if SYMBOL.fullmatch(name):
                put(catalog, "callables", name.lstrip("\\").lower(), page, shared_summary)
        return

    class_name = ""
    if page.startswith(("class.", "enum.")):
        name = prose(root.find("d:titleabbrev", NS))
        if SYMBOL.fullmatch(name) and "::" not in name:
            class_name = name.lstrip("\\").lower()
            intro = next((node for node in root.findall("d:partintro/d:section", NS)
                          if node.get(XML_ID, "").endswith(".intro")), None)
            summary = first_paragraph(intro) if intro is not None else ""
            put(catalog, "types", class_name, page, summary or prose(root.find("d:title", NS)))

    if not class_name and not page.endswith(".constants"):
        return
    for entry in root.iter(DOCBOOK + "varlistentry"):
        anchor = entry.get(XML_ID, "")
        target = page + ".php" + ("#" + anchor if PAGE_ID.fullmatch(anchor) else "")
        item = entry.find("d:listitem", NS)
        summary = first_paragraph(item) if item is not None else ""
        for term in entry.findall("d:term", NS):
            for node in term.iter(DOCBOOK + "constant"):
                name = prose(node)
                if SYMBOL.fullmatch(name):
                    key = normalized_constant(name)
                    if class_name and "::" not in key:
                        key = class_name + "::" + key
                    put(catalog, "constants", key, target, summary, 2 if anchor else 1)
            if class_name:
                for node in term.iter(DOCBOOK + "varname"):
                    name = prose(node).lstrip("$")
                    if re.fullmatch(IDENTIFIER, name):
                        put(catalog, "properties", class_name + "::$" + name, target, summary)


def put(catalog, group, key, page, summary, priority=1):
    previous = catalog[group].get(key, (0, "", ""))
    if (bool(summary), priority) > (bool(previous[2]), previous[0]):
        path = page if page.split("#")[0].endswith(".php") else page + ".php"
        catalog[group][key] = (priority, path, summary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    catalog = {group: {} for group in ("callables", "types", "constants", "properties")}
    prefix = f"doc-en-{REVISION}/"
    with tarfile.open(args.archive, "r:gz") as archive:
        for member in sorted(archive.getmembers(), key=lambda entry: entry.name):
            if not member.isfile() or not member.name.endswith(".xml") or not member.name.startswith(
                (prefix + "reference/", prefix + "language/")
            ):
                continue
            with archive.extractfile(member) as entry:
                source = entry.read().decode("utf-8-sig")
            root_tag = DOCUMENT_ROOT.match(source)
            if root_tag is None or (
                root_tag[1] != "refentry"
                and not re.search(r'xml:id="(?:(?:class|enum)\.[^"]+|[^"]+\.constants)"', root_tag[2])
            ):
                continue
            # php/doc-base supplies the external entities when building the manual.
            # The editor catalog only uses summaries with self-contained text.
            try:
                root = ET.fromstring(ENTITY.sub(replace_entity, source))
            except ET.ParseError as error:
                raise ValueError(f"{member.name}: {error}") from error
            extract(root, catalog)

    if not all(catalog.values()):
        raise ValueError(f"Expected a php/doc-en archive at revision {REVISION}")
    result = {"source": SOURCE, **{
        group: {key: [page, summary] for key, (_, page, summary) in sorted(entries.items())}
        for group, entries in catalog.items()
    }}
    # Keep entries on one line for code review.
    with OUTPUT.open("w", encoding="utf-8") as output:
        output.write("{\n")
        output.write(f'  "source": {json.dumps(SOURCE)},\n')
        for index, (group, entries) in enumerate(catalog.items()):
            output.write(f'  "{group}": {{\n')
            lines = (f"    {json.dumps(key)}: {json.dumps(value, ensure_ascii=False)}"
                     for key, value in result[group].items())
            output.write(",\n".join(lines) + "\n")
            output.write("  }" + ("," if index < len(catalog) - 1 else "") + "\n")
        output.write("}\n")
    print(", ".join(f"{len(entries)} {group}" for group, entries in catalog.items()))


if __name__ == "__main__":
    main()

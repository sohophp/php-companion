import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-implicit-nullable-runtime.mjs PHP_COMMAND...');
const probe = "declare(strict_types=1);\nerror_reporting(E_ALL & ~E_DEPRECATED);\nclass Value {}\nfunction takeArray(array $value = null) { return $value; }\nfunction takeInt(int $value = NULL) { return $value; }\nfunction takeString(string $value = 'null') { return $value; }\n$closure = function (Value $value = null) { return $value; };\n$rows=[];\nforeach (['takeArray','takeInt','takeString'] as $name) {\n $p=(new ReflectionFunction($name))->getParameters()[0];\n try { $result=$name(null); $accepted=true; } catch (TypeError $e) { $accepted=false; }\n $rows[]=['name'=>$name,'nullable'=>$p->allowsNull(),'accepted'=>$accepted];\n}\n$rows[]=['name'=>'closure','nullable'=>(new ReflectionFunction($closure))->getParameters()[0]->allowsNull(),'accepted'=>$closure(null)===null];\ntry { $substr = substr('abcd',0,null); $substrAcceptsNull = true; } catch (TypeError $e) { $substr = null; $substrAcceptsNull = false; }\necho json_encode(['version'=>PHP_VERSION,'rows'=>$rows,'substr'=>$substr,'substrAcceptsNull'=>$substrAcceptsNull]);\n";
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-d', 'error_reporting=8191', '-r', probe], { encoding: 'utf8', timeout: 10000 }));
  for (const row of result.rows) { assert.equal(row.nullable, row.name !== 'takeString'); assert.equal(row.accepted, row.name !== 'takeString'); }
  assert.equal(result.substrAcceptsNull, Number(result.version.split('.')[0]) >= 8);
  process.stdout.write(JSON.stringify(result) + '\n');
}

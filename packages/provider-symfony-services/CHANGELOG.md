# Changelog

- Publish exact PHP Configurator `parameters()->set()` declaration identities alongside YAML and XML parameters without reading or serializing values.

- Publish exact XML parameter declaration identities alongside YAML parameters without reading or serializing parameter values.

- Publish exact YAML parameter declaration identities from every file in the authoritative service configuration graph without publishing parameter values.

- Publish only service configuration files that actually exist and participate in the authoritative graph; missing conventional candidates no longer make complete cross-file refactors fail.

## 0.1.0-alpha.1

- 首个权威 Symfony 服务容器 Provider，支持静态配置、Bundle 导入、资源展开、新鲜编译容器和打开文档快照。

# [2.2.0](https://github.com/TimoBechtel/socketdb/compare/v2.1.2...v2.2.0) (2021-01-21)


### Features

* **client:** add client side update batching ([720c33a](https://github.com/TimoBechtel/socketdb/commit/720c33abb5c37fc673f70d0a1b009d4567e664b0))

## [2.1.2](https://github.com/TimoBechtel/socketdb/compare/v2.1.1...v2.1.2) (2020-12-19)


### Bug Fixes

* **dependencies:** fix missing ws dependency ([5e56c75](https://github.com/TimoBechtel/socketdb/commit/5e56c75a5f5b144f3b2c2573e2161997004f5b2e))

## [2.1.1](https://github.com/TimoBechtel/socketdb/compare/v2.1.0...v2.1.1) (2020-12-14)


### Bug Fixes

* issues with unsubscribing and resubscribing ([b3bfd99](https://github.com/TimoBechtel/socketdb/commit/b3bfd991b18ae6321518b0b237f8eae4a0b855be))

# [2.1.0](https://github.com/TimoBechtel/socketdb/compare/v2.0.0...v2.1.0) (2020-12-05)


### Features

* **client:** automatically reconnect on connection lost ([06c636b](https://github.com/TimoBechtel/socketdb/commit/06c636be0fc0ba266776ed10e6638a8394c8639f))

# [2.0.0](https://github.com/TimoBechtel/socketdb/compare/v1.0.0...v2.0.0) (2020-11-23)


### Bug Fixes

* **client:** add check for window object ([5b0cbc5](https://github.com/TimoBechtel/socketdb/commit/5b0cbc54d883bbc7dfa8d366bacec73b67df7464))


### Features

* replace socket.io with native websockets ([8892b41](https://github.com/TimoBechtel/socketdb/commit/8892b41e77ccce2a689df3c16fcb04da164e4973))


### BREAKING CHANGES

* API for initializing Server and Client was changed. It does not need a socket.io instance anymore.

# 1.0.0 (2020-11-19)


### Bug Fixes

* **client:** callback loop when setting a value in a once callback ([1906c75](https://github.com/TimoBechtel/socketdb/commit/1906c757566fef73d1169bb4ec2b044d85182d8f))
* **client:** changing a value of a received object is not recognized as change on set ([45f67ae](https://github.com/TimoBechtel/socketdb/commit/45f67ae82400dbff2be7bc8380f0dfedc58aaf01))

## [3.6.1](https://github.com/TimoBechtel/socketdb/compare/v3.6.0...v3.6.1) (2021-02-17)


### Bug Fixes

* **client:** once cancels other subscriptions ([7e68a87](https://github.com/TimoBechtel/socketdb/commit/7e68a87c23973c4eeb4800345c5903d76a0aa8e6)), closes [#20](https://github.com/TimoBechtel/socketdb/issues/20)

# [3.6.0](https://github.com/TimoBechtel/socketdb/compare/v3.5.1...v3.6.0) (2021-02-15)


### Features

* **client:** add disconnnect function ([2c26ec4](https://github.com/TimoBechtel/socketdb/commit/2c26ec47676f96d7f46eb017398788be08e9f55c))

## [3.5.1](https://github.com/TimoBechtel/socketdb/compare/v3.5.0...v3.5.1) (2021-02-15)


### Bug Fixes

* **hooks:** passing metadata as reference ([3f4cff7](https://github.com/TimoBechtel/socketdb/commit/3f4cff73987985918a84fc0e572fdac509522c10))

# [3.5.0](https://github.com/TimoBechtel/socketdb/compare/v3.4.0...v3.5.0) (2021-02-13)


### Features

* **browser:** add browser bundle ([cd070eb](https://github.com/TimoBechtel/socketdb/commit/cd070ebb40cd9bd8f6b05ae5cbcd43bc736d74ad)), closes [#13](https://github.com/TimoBechtel/socketdb/issues/13)

# [3.4.0](https://github.com/TimoBechtel/socketdb/compare/v3.3.0...v3.4.0) (2021-02-12)


### Features

* **hooks:** add delete hooks ([3d2cabc](https://github.com/TimoBechtel/socketdb/commit/3d2cabc19386e87fd4fb8e97d26d6a8be76035d0))

# [3.3.0](https://github.com/TimoBechtel/socketdb/compare/v3.2.0...v3.3.0) (2021-02-12)


### Features

* add delete function ([9ffd25f](https://github.com/TimoBechtel/socketdb/commit/9ffd25fc05db1bf9477c7c11d945c37922f97244)), closes [#9](https://github.com/TimoBechtel/socketdb/issues/9)

# [3.2.0](https://github.com/TimoBechtel/socketdb/compare/v3.1.0...v3.2.0) (2021-02-12)


### Features

* **client:** allow setting metadata ([f35131b](https://github.com/TimoBechtel/socketdb/commit/f35131b2ee93fbfd881431a7f576bd61ff125e15)), closes [#7](https://github.com/TimoBechtel/socketdb/issues/7)

# [3.1.0](https://github.com/TimoBechtel/socketdb/compare/v3.0.0...v3.1.0) (2021-02-11)


### Features

* **plugins:** add hook based plugin system ([a40b61a](https://github.com/TimoBechtel/socketdb/commit/a40b61ab69d9846146dfff9c845adbfc3ef5a2ff)), closes [#8](https://github.com/TimoBechtel/socketdb/issues/8)

# [3.0.0](https://github.com/TimoBechtel/socketdb/compare/v2.2.0...v3.0.0) (2021-01-30)


### Code Refactoring

* store nodes as objects ([d754093](https://github.com/TimoBechtel/socketdb/commit/d75409333e65e06812d8d737131a1d1439b6ad90))


### BREAKING CHANGES

* store api has changed. it now returns and accepts only node object types. this also
changes the server api, as the update and get methods now also require data as node types.

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

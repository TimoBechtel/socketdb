# Changelog

## [8.0.2](https://github.com/TimoBechtel/socketdb/compare/v8.0.1...v8.0.2) (2023-07-13)


### Bug Fixes

* **core:** type for GoodbyeMessage ([d67c550](https://github.com/TimoBechtel/socketdb/commit/d67c550c9e3a085e6167e1ebe3d6f18d5718cff3))

## [8.0.1](https://github.com/TimoBechtel/socketdb/compare/v8.0.0...v8.0.1) (2023-07-13)


### Bug Fixes

* **client:** wrong types for connect function ([85e3910](https://github.com/TimoBechtel/socketdb/commit/85e3910ef86d52a0f45216c65c92ba8ab647377a))

## [8.0.0](https://github.com/TimoBechtel/socketdb/compare/v7.2.0...v8.0.0) (2023-07-12)


### ⚠ BREAKING CHANGES

* **client:** The client now requires a ".connect()" call to establish a connection.

### Features

* **client:** add connect function to allow initializing without connecting ([5910eac](https://github.com/TimoBechtel/socketdb/commit/5910eac84d6100ff02102df96477dfdc92505acf))


### Bug Fixes

* **docs:** broken links ([a1d8fea](https://github.com/TimoBechtel/socketdb/commit/a1d8fea8376276434110c3d2810c773e7873408b))

## [7.2.0](https://github.com/TimoBechtel/socketdb/compare/v7.1.0...v7.2.0) (2023-06-02)


### Features

* allow sending a disconnect reason to the client ([03f8fdb](https://github.com/TimoBechtel/socketdb/commit/03f8fdbb336680efd5b8681c696725ea91bbc4e5))
* **server:** add api to manage client connections ([a792f41](https://github.com/TimoBechtel/socketdb/commit/a792f411e8c613197accf0a17b995e85f2265644))

## [7.1.0](https://github.com/TimoBechtel/socketdb/compare/v7.0.0...v7.1.0) (2023-04-30)


### Features

* **server:** add hook that is called on initialization ([b872ab1](https://github.com/TimoBechtel/socketdb/commit/b872ab1ec424e83519b56164730885a9f427334d))


### Performance Improvements

* replace clone function with an implementation that is 3x as fast ([e469b78](https://github.com/TimoBechtel/socketdb/commit/e469b78e148f291389585a3d627f4ba8946eaacb))

## [7.0.0](https://github.com/TimoBechtel/socketdb/compare/v6.2.0...v7.0.0) (2023-04-02)


### ⚠ BREAKING CHANGES

* **server:** The server doesn't start automatically anymore. It now requires a .listen() call.
* **server:** Deprecated type alias SocketDB has been removed. Use SocketDBServerAPI instead.
* **core:** Removed deprecated type aliases KeyValue & Value. Use Json & LeafValue instead.
* This update affects both client & server. Make sure to update both.

### Features

* add heartbeat mechanism ([ce491cd](https://github.com/TimoBechtel/socketdb/commit/ce491cd752f2d093305135e75fb18f7054584605))
* add intercept api to make it easier to call into hooks ([ebeadd6](https://github.com/TimoBechtel/socketdb/commit/ebeadd61a9221e0c81f1648fbbcbf1e781e6561d)), closes [#50](https://github.com/TimoBechtel/socketdb/issues/50)


### Code Refactoring

* **core:** remove deprecated type exports ([1964b4f](https://github.com/TimoBechtel/socketdb/commit/1964b4f7734680ae9c993b9f623b1b0e839463ee))
* **server:** remove auto-listen feature ([3f32429](https://github.com/TimoBechtel/socketdb/commit/3f32429bb0c2d5f82c66e7f551b531da22b80154))
* **server:** remove deprecated type alias ([492a965](https://github.com/TimoBechtel/socketdb/commit/492a965c701e787a7fa7add95f5527f683fc05d0))

## [6.2.0](https://github.com/TimoBechtel/socketdb/compare/v6.1.0...v6.2.0) (2023-03-26)


### Features

* **server:** allow adding multiple callbacks to the default websocketServer ([a0e932f](https://github.com/TimoBechtel/socketdb/commit/a0e932f87242b2732ce7445b54ea8736aeda258c))

## [6.1.0](https://github.com/TimoBechtel/socketdb/compare/v6.0.0...v6.1.0) (2023-02-10)


### Features

* **server:** add schema type for the server ([91dee56](https://github.com/TimoBechtel/socketdb/commit/91dee564bdabdc77168a6a092cbee4d2d95d730f))


### Bug Fixes

* **client:** wrong schema for the root instance ([1b6abb8](https://github.com/TimoBechtel/socketdb/commit/1b6abb8818b647391941bf3bdb82577513790efe))

## [6.0.0](https://github.com/TimoBechtel/socketdb/compare/v5.0.1...v6.0.0) (2023-02-09)


### ⚠ BREAKING CHANGES

* **server:** The interface for custom websocket-servers has changed. It now needs to return a listen function.

### Features

* **server:** add api for creatinging a user session context ([40a8f4c](https://github.com/TimoBechtel/socketdb/commit/40a8f4c834a59c0bcd61c2e0e811472c87beb035))

## [5.0.1](https://github.com/TimoBechtel/socketdb/compare/v5.0.0...v5.0.1) (2023-01-25)

### Bug Fixes

- **client:** updates being sent even if nothing has changed ([801fcfc](https://github.com/TimoBechtel/socketdb/commit/801fcfc5c84d94288e0a20a998d0e44059c18546))

## [5.0.0](https://github.com/TimoBechtel/socketdb/compare/v4.2.1...v5.0.0) (2023-01-20)

### ⚠ BREAKING CHANGES

- **core:** the store now returns null if there is no data for a given path instead of always returning an empty node. if you use a custom store or use the store from @socketdb/core directly, make sure to update accordingly.
- changed the underlying events-system. this breaks compatibility with previous versions. make sure to upgrade both client and server.

### Bug Fixes

- each callback not run again after data for path has been re-added ([c3f0d35](https://github.com/TimoBechtel/socketdb/commit/c3f0d354cf6ed74a484d35a7875a3db8f906f8c0))

### Code Refactoring

- **core:** store returns null for empty data ([c3f0d35](https://github.com/TimoBechtel/socketdb/commit/c3f0d354cf6ed74a484d35a7875a3db8f906f8c0))

## [4.2.1](https://github.com/TimoBechtel/socketdb/compare/v4.2.0...v4.2.1) (2022-11-18)

### Bug Fixes

- **core:** add undefined as allowed primitive value ([1e9c35c](https://github.com/TimoBechtel/socketdb/commit/1e9c35c5a130eab4ffdb8ec642cc06cf5f826c9b))

## [4.2.0](https://github.com/TimoBechtel/socketdb/compare/v4.1.1...v4.2.0) (2022-11-17)

### Features

- **core:** improve SchemaDefinition types ([5a33d8a](https://github.com/TimoBechtel/socketdb/commit/5a33d8ab50cfde086670849ed7b9ffb8c92a5128))

## [4.1.1](https://github.com/TimoBechtel/socketdb/compare/v4.1.0...v4.1.1) (2022-11-15)

### Bug Fixes

- wrong readme files for packages ([fa9f411](https://github.com/TimoBechtel/socketdb/commit/fa9f4114570c916dd90117920a878c12614cf559))

## [4.1.0](https://github.com/TimoBechtel/socketdb/compare/v4.0.2...v4.1.0) (2022-11-15)

### Features

- **client:** add commonjs support ([ac670dc](https://github.com/TimoBechtel/socketdb/commit/ac670dcb67eafe06ed1305c39188bde577159f09))
- **plugin-validate:** add support for socketdb v4 ([8c8c91e](https://github.com/TimoBechtel/socketdb/commit/8c8c91e7ac4407dc15f8b5fbdb50241f32c0d6b9))

## [4.0.2](https://github.com/TimoBechtel/socketdb/compare/v4.0.1...v4.0.2) (2022-11-15)

### Bug Fixes

- **client:** check for websocket ready state before sending ([7ac28ab](https://github.com/TimoBechtel/socketdb/commit/7ac28ab19dc63329f223313564e409dbea7ad9bd))

## [4.0.1](https://github.com/TimoBechtel/socketdb/compare/v4.0.0...v4.0.1) (2022-11-15)

### Bug Fixes

- wrong @socketdb/core dependency version ([095ab6d](https://github.com/TimoBechtel/socketdb/commit/095ab6d22f23853f3d0123d04d3e9685c8e1b732))

## [4.0.0](https://github.com/TimoBechtel/socketdb/compare/v3.9.0...v4.0.0) (2022-11-14)

### ⚠ BREAKING CHANGES

- socketdb has been split into @socketdb/client & @socketdb/server
- changed the underlying events-system. this breaks compatibility with previous versions. make sure to upgrade both client and server

### Features

- batch all socketevents ([8a06672](https://github.com/TimoBechtel/socketdb/commit/8a0667270d920e744fb72328dd72e9999bbdecc0))
- update documentation url ([712ed49](https://github.com/TimoBechtel/socketdb/commit/712ed49f054a694bda861db25a9967f48112a8dc))

### Code Refactoring

- move to a monorepo ([5ba03ed](https://github.com/TimoBechtel/socketdb/commit/5ba03ed9743b22d2c93507e0475f86885315fd18))
- prefix socket events with a context ([bb89f10](https://github.com/TimoBechtel/socketdb/commit/bb89f103894533ff0938a4e60b833aab6442ff84))

## [3.9.0](https://github.com/TimoBechtel/socketdb/compare/v3.8.1...v3.9.0) (2022-05-13)

### Features

- **server:** allow adding a user context ([b00f0bc](https://github.com/TimoBechtel/socketdb/commit/b00f0bcdffbe1994d22f4c57e8e5b7d7e97041c0)), closes [#26](https://github.com/TimoBechtel/socketdb/issues/26)

## [3.8.1](https://github.com/TimoBechtel/socketdb/compare/v3.8.0...v3.8.1) (2021-10-17)

### Bug Fixes

- **typescript:** allow using types without providing a generic type ([a973a93](https://github.com/TimoBechtel/socketdb/commit/a973a93c6a530eb927ad146e90776285049ad0d7))

## [3.8.0](https://github.com/TimoBechtel/socketdb/compare/v3.7.2...v3.8.0) (2021-10-17)

### Features

- **plugins:** add server api to plugin context ([35e6d76](https://github.com/TimoBechtel/socketdb/commit/35e6d767dc40c76e40d6659daebce319a8a0f4cd))
- **typescript:** add type checking by using a data schema ([aeb93c4](https://github.com/TimoBechtel/socketdb/commit/aeb93c4c9d3b3b60c6a385a5a046f2c18125cf83))

## [3.7.2](https://github.com/TimoBechtel/socketdb/compare/v3.7.1...v3.7.2) (2021-02-22)

### Bug Fixes

- **client:** each called multiple times ([09451f6](https://github.com/TimoBechtel/socketdb/commit/09451f6669e7bcf5e4c30eb1399be2d8e237d00c))

## [3.7.1](https://github.com/TimoBechtel/socketdb/compare/v3.7.0...v3.7.1) (2021-02-22)

### Bug Fixes

- **client:** not notifying "each" when higher path is subscribed ([2da5a9c](https://github.com/TimoBechtel/socketdb/commit/2da5a9ce6487397ae3de529a92ff66523b4e3d4a))

## [3.7.0](https://github.com/TimoBechtel/socketdb/compare/v3.6.3...v3.7.0) (2021-02-19)

### Features

- **hooks:** add hooks context ([c12e6c7](https://github.com/TimoBechtel/socketdb/commit/c12e6c7668224c41bcac8cbb7b225d6fdc92b9f9))

## [3.6.3](https://github.com/TimoBechtel/socketdb/compare/v3.6.2...v3.6.3) (2021-02-19)

### Bug Fixes

- **server:** issue that server wont send update on deletion ([f5d30a1](https://github.com/TimoBechtel/socketdb/commit/f5d30a1a64923d5bb16250a3a10b3f22e6d09daa))
- **server:** issue with sending empty updates ([c270da2](https://github.com/TimoBechtel/socketdb/commit/c270da2ad31a83bdb79240b6480716d8a25023a0))

## [3.6.2](https://github.com/TimoBechtel/socketdb/compare/v3.6.1...v3.6.2) (2021-02-18)

### Bug Fixes

- **client:** first subscription sometimes not receiving value ([6100494](https://github.com/TimoBechtel/socketdb/commit/61004949405b78cd8015b5ae82d605fc31def9cb)), closes [#19](https://github.com/TimoBechtel/socketdb/issues/19)

## [3.6.1](https://github.com/TimoBechtel/socketdb/compare/v3.6.0...v3.6.1) (2021-02-17)

### Bug Fixes

- **client:** once cancels other subscriptions ([7e68a87](https://github.com/TimoBechtel/socketdb/commit/7e68a87c23973c4eeb4800345c5903d76a0aa8e6)), closes [#20](https://github.com/TimoBechtel/socketdb/issues/20)

## [3.6.0](https://github.com/TimoBechtel/socketdb/compare/v3.5.1...v3.6.0) (2021-02-15)

### Features

- **client:** add disconnnect function ([2c26ec4](https://github.com/TimoBechtel/socketdb/commit/2c26ec47676f96d7f46eb017398788be08e9f55c))

## [3.5.1](https://github.com/TimoBechtel/socketdb/compare/v3.5.0...v3.5.1) (2021-02-15)

### Bug Fixes

- **hooks:** passing metadata as reference ([3f4cff7](https://github.com/TimoBechtel/socketdb/commit/3f4cff73987985918a84fc0e572fdac509522c10))

## [3.5.0](https://github.com/TimoBechtel/socketdb/compare/v3.4.0...v3.5.0) (2021-02-13)

### Features

- **browser:** add browser bundle ([cd070eb](https://github.com/TimoBechtel/socketdb/commit/cd070ebb40cd9bd8f6b05ae5cbcd43bc736d74ad)), closes [#13](https://github.com/TimoBechtel/socketdb/issues/13)

## [3.4.0](https://github.com/TimoBechtel/socketdb/compare/v3.3.0...v3.4.0) (2021-02-12)

### Features

- **hooks:** add delete hooks ([3d2cabc](https://github.com/TimoBechtel/socketdb/commit/3d2cabc19386e87fd4fb8e97d26d6a8be76035d0))

## [3.3.0](https://github.com/TimoBechtel/socketdb/compare/v3.2.0...v3.3.0) (2021-02-12)

### Features

- add delete function ([9ffd25f](https://github.com/TimoBechtel/socketdb/commit/9ffd25fc05db1bf9477c7c11d945c37922f97244)), closes [#9](https://github.com/TimoBechtel/socketdb/issues/9)

## [3.2.0](https://github.com/TimoBechtel/socketdb/compare/v3.1.0...v3.2.0) (2021-02-12)

### Features

- **client:** allow setting metadata ([f35131b](https://github.com/TimoBechtel/socketdb/commit/f35131b2ee93fbfd881431a7f576bd61ff125e15)), closes [#7](https://github.com/TimoBechtel/socketdb/issues/7)

## [3.1.0](https://github.com/TimoBechtel/socketdb/compare/v3.0.0...v3.1.0) (2021-02-11)

### Features

- **plugins:** add hook based plugin system ([a40b61a](https://github.com/TimoBechtel/socketdb/commit/a40b61ab69d9846146dfff9c845adbfc3ef5a2ff)), closes [#8](https://github.com/TimoBechtel/socketdb/issues/8)

## [3.0.0](https://github.com/TimoBechtel/socketdb/compare/v2.2.0...v3.0.0) (2021-01-30)

### Code Refactoring

- store nodes as objects ([d754093](https://github.com/TimoBechtel/socketdb/commit/d75409333e65e06812d8d737131a1d1439b6ad90))

### BREAKING CHANGES

- store api has changed. it now returns and accepts only node object types. this also
  changes the server api, as the update and get methods now also require data as node types.

## [2.2.0](https://github.com/TimoBechtel/socketdb/compare/v2.1.2...v2.2.0) (2021-01-21)

### Features

- **client:** add client side update batching ([720c33a](https://github.com/TimoBechtel/socketdb/commit/720c33abb5c37fc673f70d0a1b009d4567e664b0))

## [2.1.2](https://github.com/TimoBechtel/socketdb/compare/v2.1.1...v2.1.2) (2020-12-19)

### Bug Fixes

- **dependencies:** fix missing ws dependency ([5e56c75](https://github.com/TimoBechtel/socketdb/commit/5e56c75a5f5b144f3b2c2573e2161997004f5b2e))

## [2.1.1](https://github.com/TimoBechtel/socketdb/compare/v2.1.0...v2.1.1) (2020-12-14)

### Bug Fixes

- issues with unsubscribing and resubscribing ([b3bfd99](https://github.com/TimoBechtel/socketdb/commit/b3bfd991b18ae6321518b0b237f8eae4a0b855be))

## [2.1.0](https://github.com/TimoBechtel/socketdb/compare/v2.0.0...v2.1.0) (2020-12-05)

### Features

- **client:** automatically reconnect on connection lost ([06c636b](https://github.com/TimoBechtel/socketdb/commit/06c636be0fc0ba266776ed10e6638a8394c8639f))

## [2.0.0](https://github.com/TimoBechtel/socketdb/compare/v1.0.0...v2.0.0) (2020-11-23)

### Bug Fixes

- **client:** add check for window object ([5b0cbc5](https://github.com/TimoBechtel/socketdb/commit/5b0cbc54d883bbc7dfa8d366bacec73b67df7464))

### Features

- replace socket.io with native websockets ([8892b41](https://github.com/TimoBechtel/socketdb/commit/8892b41e77ccce2a689df3c16fcb04da164e4973))

### BREAKING CHANGES

- API for initializing Server and Client was changed. It does not need a socket.io instance anymore.

## 1.0.0 (2020-11-19)

### Bug Fixes

- **client:** callback loop when setting a value in a once callback ([1906c75](https://github.com/TimoBechtel/socketdb/commit/1906c757566fef73d1169bb4ec2b044d85182d8f))
- **client:** changing a value of a received object is not recognized as change on set ([45f67ae](https://github.com/TimoBechtel/socketdb/commit/45f67ae82400dbff2be7bc8380f0dfedc58aaf01))

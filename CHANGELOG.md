# [1.2.0](https://github.com/fgiova/localstack-explorer/compare/v1.1.0...v1.2.0) (2026-04-02)


### Bug Fixes

* handle InternalError with AppError and improve timeout settings in integration tests ([c3eb255](https://github.com/fgiova/localstack-explorer/commit/c3eb25548fd6fdf0a820d61a690e4794d514fd31))


### Features

* add Lambda service plugin with full CRUD, invoke, versions, and aliases ([d1466e4](https://github.com/fgiova/localstack-explorer/commit/d1466e4de6dab1fee7c3f176d8faa666f4272932))
* add triggers tab to Lambda plugin with event source mappings and resource policy detection ([f5b9397](https://github.com/fgiova/localstack-explorer/commit/f5b9397801aaa2c7a6723e34bb7bf20f65ec6ea5))

# [1.1.0](https://github.com/fgiova/localstack-explorer/compare/v1.0.0...v1.1.0) (2026-04-02)


### Bug Fixes

* add icons directory to Dockerfile for localstack-explorer-builder ([5d299c8](https://github.com/fgiova/localstack-explorer/commit/5d299c8cfeaa99c9a8dc87181df8a587e90513b1))


### Features

* add TypeScript configuration for build and testing, implement global setup and teardown for tests ([d72558f](https://github.com/fgiova/localstack-explorer/commit/d72558f5324c9bbe762c0f1d208f8ad03f4b89a0))
* detect active LocalStack services at runtime and display their status in the UI ([3e9368c](https://github.com/fgiova/localstack-explorer/commit/3e9368ca386a41dd3ed052bcb8ace9ddd0108422))

# 1.0.0 (2026-04-01)


### Bug Fixes

* add LOCALSTACK_REGION configuration and update related service references ([3ff6f55](https://github.com/fgiova/localstack-explorer/commit/3ff6f5567b6fe30a7d93f5c6e081b71725fab723))
* enhance SQS message handling with deduplication and improved delete request structure ([7efbe13](https://github.com/fgiova/localstack-explorer/commit/7efbe13580c609e2971f31d0a5f5f9354d11294c))
* remove unused S3Service type import from s3.test.ts ([2043813](https://github.com/fgiova/localstack-explorer/commit/20438139a916e64e34f268a780ad57e2df3bcde9))


### Features

* add CI/CD pipelines with semantic-release and multi-platform Electron builds ([42aa1e8](https://github.com/fgiova/localstack-explorer/commit/42aa1e890a029afc96e0d137474c01f2c546687e))
* add Electron desktop app with build configuration and static file serving ([5a79844](https://github.com/fgiova/localstack-explorer/commit/5a7984461ac47927ba9c20e2dc3f7ce85770157a))
* add Fastify server setup with service plugin registration and static file serving ([ad6e779](https://github.com/fgiova/localstack-explorer/commit/ad6e7793a8fbbd0f35bb3c1c0011765f956a0acd))
* add GitHub link and copyright notice to the sidebar ([d816ab3](https://github.com/fgiova/localstack-explorer/commit/d816ab3da91c435c84bcfd24daace6b1f24324dc))
* add multi-arch Docker build with optimized multi-stage Dockerfile ([ec48016](https://github.com/fgiova/localstack-explorer/commit/ec480167b92a399f1b47f4ccaa638116d3e7ba57))
* add per-client region/endpoint selection and remove CloudFront plugin ([f16a505](https://github.com/fgiova/localstack-explorer/commit/f16a5057697cefbcab297f04c73d3f8cc7301a6e))
* add selective service enablement feature with configuration updates and UI adjustments ([5b22f95](https://github.com/fgiova/localstack-explorer/commit/5b22f95f94acfc37a68e56c778a35064b4b17b71))
* add subscription management features with filtering and raw message delivery options ([b2e8fac](https://github.com/fgiova/localstack-explorer/commit/b2e8fac305be4effe84864dd4f6af612c0f144e0))
* enhance SQS message handling with polling support and configurable parameters ([bf7cee4](https://github.com/fgiova/localstack-explorer/commit/bf7cee4fd00e1ac8289738ed65e63da56f49697e))
* implement CloudFront distribution management with create, update, delete, and list functionalities ([cac5b42](https://github.com/fgiova/localstack-explorer/commit/cac5b42f6580f58028131c60f4b39fc77d051a9a))
* implement DynamoDB service with table management, including creation, listing, and detail views ([d10155e](https://github.com/fgiova/localstack-explorer/commit/d10155e51e646e9e0555cf9435ba35590d942cfa))
* implement IAM user, group, and policy management with creation dialogs and detailed views ([74f15f9](https://github.com/fgiova/localstack-explorer/commit/74f15f935ac41f3e1bb815745eb86f3ccec40e90))
* implement SNS topic management with create, delete, and detail features ([3dc18ef](https://github.com/fgiova/localstack-explorer/commit/3dc18efa567c98a3bf1350d71791f9772703a2c1))
* implement SQS queue management with create, delete, and message handling features ([cc00554](https://github.com/fgiova/localstack-explorer/commit/cc00554e9f643f8bdbaba6466b5544e5b8c88869))
* implement stack update and delete functionality with enhanced template management ([31806c2](https://github.com/fgiova/localstack-explorer/commit/31806c201e780c2b61130c7f246d6cacc87be3b8))
* initialize project structure with basic configurations and components ([28688ca](https://github.com/fgiova/localstack-explorer/commit/28688ca7707fdf5f6032d98845cddc26ec41aab2))
* update Node.js version to 24 in CI configurations and adjust related tests ([f04ff23](https://github.com/fgiova/localstack-explorer/commit/f04ff235d877b9bcd82229d28ff01f7ff14516e5))
* update README with IAM and CloudFront service implementations and installation instructions ([745f1bb](https://github.com/fgiova/localstack-explorer/commit/745f1bbb6de4dc0aa91169d909152bce417d5219))

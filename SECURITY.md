# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 2.x | Yes |
| 1.x | No |

## Reporting a vulnerability

Please do not open a public issue for security vulnerabilities.

Use GitHub's private vulnerability reporting on the repository:

https://github.com/cezarsmpio/rest-mapper/security/advisories/new

Include:

- the affected version,
- a minimal reproduction,
- the expected and actual behavior,
- any known impact.

You can expect an initial response within 7 days. Confirmed vulnerabilities will be fixed in a patch release and disclosed after users have had a reasonable opportunity to upgrade.

## Dependency security

Runtime dependencies are audited with `npm audit` in CI. axios is an optional peer dependency and receives security updates through the consumer's chosen axios version. Prototype-pollution keys are rejected by the configuration and merge layers.

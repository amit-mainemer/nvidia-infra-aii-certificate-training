# NCP-AII curriculum spec (authoring reference)

Source of truth: the official **NVIDIA-Certified Professional: AI Infrastructure (NCP-AII) Exam Study Guide** (SEP25)
https://dam-cdn.nvd.orangelogic.com/AssetLink/8gauup66xn2gv80pu4m166li0bhyytk4.pdf
Exam: 70–75 questions · 120 min · $400 · online proctored (Certiverse) · valid 2 years · 2–3 yrs data-center experience with NVIDIA hardware.

Official job responsibilities include: BCM, Slurm, Pyxis, Enroot, **Run:ai**; HPL, NCCL, NeMo and ClusterKit burn-in; cabling/firmware/signal-quality verification; MIG and BlueField; monitoring cluster health.

## Modules → lessons → official objectives

| Module (id, file) | Weight | Lesson id | Lesson title | Objectives |
|---|---|---|---|---|
| 1 `bringup` `m01-bringup` | 31% | `deployment-sequence` | The bring-up sequence and AI factory network topologies | 1.1, 1.2 |
| | | `bmc-oob-tpm` | BMC, out-of-band management and TPM | 1.3 |
| | | `firmware` | Firmware upgrades on HGX systems and fault detection | 1.4 |
| | | `power-cooling-install` | Power, cooling and installing GPU servers | 1.5, 1.6, 1.9 |
| | | `cables-transceivers` | Cable types and transceivers | 1.8 |
| | | `hw-validation-storage` | Validating hardware and configuring third-party storage | 1.7, 1.10, 1.11 |
| 2 `physical` `m02-physical` | 5% | `bluefield` | Configuring and managing the BlueField platform | 2.1 |
| | | `mig` | Configuring MIG for AI and HPC | 2.2 |
| 3 `controlplane` `m03-controlplane` | 19% | `bcm-ha` | Installing Base Command Manager and configuring HA | 3.1 |
| | | `os-cluster` | OS installation, categories, interfaces and Slurm/Enroot/Pyxis | 3.2, 3.3 |
| | | `drivers` | Installing, updating and removing GPU and DOCA drivers | 3.4 |
| | | `containers-ngc` | Container Toolkit, GPUs in Docker and the NGC CLI | 3.5, 3.6, 3.7 |
| 4 `verification` `m04-verification` | 33% | `single-node-hpl` | Single-node stress tests, HPL and HPL burn-in | 4.1, 4.2, 4.12 |
| | | `nccl` | NCCL: NVLink Switch, E/W fabric bandwidth and burn-in | 4.3, 4.10, 4.11 |
| | | `cable-validation` | Validating cabling and signal quality | 4.4, 4.5 |
| | | `fw-sw-confirm` | Confirming firmware and software on switches, BlueField-3 and transceivers | 4.6, 4.7, 4.8 |
| | | `clusterkit-nemo-storage` | ClusterKit, NeMo burn-in and storage testing | 4.9, 4.13, 4.14 |
| 5 `troubleshoot` `m05-troubleshoot` | 12% | `fault-identification` | Identifying faulty GPUs, fans, NICs and power supplies | 5.1, 5.2 |
| | | `component-replacement` | Replacing faulty cards, GPUs and power supplies | 5.3 |
| | | `optimization` | Optimising AMD/Intel servers and storage | 5.4, 5.5 |

## Domain colours
bringup #22c7e8 · physical #a78bfa · controlplane #ff9f5a · verification #6d9dff · troubleshoot #f472b6

## Question counts
- Lesson checks: exactly 5 per lesson.
- Module quiz: bringup 16, physical 8, controlplane 12, verification 16, troubleshoot 10.
- Mock exam bank (`src/data/examBank.js`): 70, blueprint-weighted — bringup 22, physical 4, controlplane 13, verification 23, troubleshoot 8.

## Content format
See an existing module file for the exact shape. Lesson `blocks` types: `lede`, `h2`, `h3`, `p`, `ul`, `ol`, `code` (lang/title/x),
`callout` (kind: exam|tip|warn|trap, title?, x: string | string[]), `table` (head, rows), `vs` (cards: [{h, items}]),
`flow` (steps: [{b, s}]), `specs` (rows: [[k, v]]). Lists are `{ t: 'ul' | 'ol', items: [...] }` — not `x`.
Inline markup: `[[glossary-id|display text]]`, `**bold**`, `` `code` ``, `[label](https://url)`.
Questions: `{ q, opts: [4 strings], a: index, why, distract }`; quiz and exam questions also have `id`, `domain` (module id) and optional `scenario`.
Run `node tools/check-content.mjs` to validate every glossary link, answer index and count.

/* Training and reading list. Everything under `docs` comes from the "Suggested Readings"
   in the official NCP-AII study guide (SEP25), grouped by exam domain. */

export const officialTraining = [
  { name: 'AI Infrastructure & Operations Fundamentals', price: 'Self-paced', hours: 'Self-paced', mode: 'Online',
    why: 'The on-ramp NVIDIA recommends first: compute platforms, networking, storage and AI operations. Fills the vocabulary gaps (NVLink, InfiniBand, DGX, BCM, Slurm) that the professional exam assumes you already have.',
    url: 'https://www.nvidia.com/en-us/training/academy/course-detail/?id=course%3A15139841' },
  { name: 'AI Infrastructure Professional Workshop', price: 'Paid', hours: 'Multi-day', mode: 'Instructor-led',
    why: 'The course the study guide maps every domain to — AI data center overview, compute platforms, BlueField bring-up, BCM cluster bring-up, virtualising GPU resources, storage and hands-on practice labs. The closest thing to the real job tasks.',
    url: 'https://www.nvidia.com/en-us/training/academy/course-detail/?id=course%3A15932196' },
  { name: 'AI Infrastructure public training (NVIDIA Academy)', price: 'Varies', hours: 'Scheduled', mode: 'Instructor-led',
    why: 'Public schedule for the professional workshop, useful if your employer is not booking a private class.',
    url: 'https://academy.nvidia.com/en/ai-infrastructure-public-training/' },
  { name: 'Official NCP-AII study guide (PDF)', price: 'Free', hours: '6 pages', mode: 'Document',
    why: 'The authoritative list of all 39 objectives and the suggested reading behind this whole site. Read it once at the start and once before booking.',
    url: 'https://dam-cdn.nvd.orangelogic.com/AssetLink/8gauup66xn2gv80pu4m166li0bhyytk4.pdf' },
]

export const docs = [
  { group: 'Certification', items: [
    { name: 'Official NCP-AII exam page', url: 'https://www.nvidia.com/en-eu/learn/certification/ai-infrastructure-professional/', note: 'Format, price, blueprint weights and registration. Re-check it before booking — weights change between revisions.' },
    { name: 'Register on Certiverse', url: 'https://www.certiverse.com/#/checkout/nvidia/store-exam/NCP-AII', note: 'The proctoring platform that delivers the exam.' },
    { name: 'NVIDIA certification catalogue', url: 'https://www.nvidia.com/en-us/learn/certification/', note: 'Including the associate-level NCA-AIIO (AI Infrastructure & Operations) if you want a stepping stone.' },
  ]},
  { group: 'Domain 1 — System and server bring-up', items: [
    { name: 'DGX SuperPOD deployment guide — cluster setup', url: 'https://docs.nvidia.com/dgx-superpod/deployment-guide-dgx-superpod/latest/cluster-setup.html', note: 'The reference bring-up sequence for a SuperPOD, from BCM head node to provisioned compute nodes.' },
    { name: 'DGX H100/H200 user guide — quick start and basic operation', url: 'https://docs.nvidia.com/dgx/dgxh100-user-guide/quickstart-basics.html', note: 'BMC setup, first boot, network ports and front/rear panel layout.' },
    { name: 'DGX H100 user guide (PDF)', url: 'https://docs.nvidia.com/dgx/dgxh100-user-guide/dgxh100-user-guide.pdf', note: 'Full reference: BMC, firmware, storage, network ports and service procedures.' },
    { name: 'DGX B200 firmware update guide', url: 'https://docs.nvidia.com/dgx/dgxb200-fw-update-guide/', note: 'nvfwupd, update order and activation — the HGX firmware objective in practice.' },
    { name: 'AI Factory white paper — deployment strategies', url: 'https://docs.nvidia.com/ai-enterprise/planning-resource/ai-factory-white-paper/latest/deployment-strategies.html', note: 'How NVIDIA frames an AI factory end to end.' },
    { name: 'DGX SuperPOD data center design — cooling', url: 'https://docs.nvidia.com/dgx-superpod/design-guides/dgx-superpod-data-center-design-h100/latest/cooling.html', note: 'Power density, airflow and cooling requirements per rack.' },
    { name: 'Cabling data centers (PDF)', url: 'https://docs.nvidia.com/cabling-data-centers.pdf', note: 'Cable types, reach, labelling and routing practice.' },
    { name: 'SuperPOD cabling design — switch ports', url: 'https://docs.nvidia.com/dgx-superpod/design-guide-cabling-data-centers/latest/switch-ports.html', note: 'Which node port goes to which leaf — the rail-optimised pattern in detail.' },
    { name: 'NVIDIA LinkX interconnect', url: 'https://www.nvidia.com/en-us/networking/interconnect/', note: 'DAC, ACC, AOC and transceiver families with their reaches.' },
    { name: 'Datacenter efficiency metrics', url: 'https://blogs.nvidia.com/blog/datacenter-efficiency-metrics-isc/', note: 'PUE and performance-per-watt framing for power and cooling validation.' },
    { name: 'Protecting sensitive data and AI models with confidential computing', url: 'https://developer.nvidia.com/blog/protecting-sensitive-data-and-ai-models-with-confidential-computing/', note: 'Background for TPM, measured boot and platform security.' },
    { name: 'NGC CLI command reference', url: 'https://docs.ngc.nvidia.com/cli/cmd.html', note: 'Installing and configuring the ngc tool on hosts.' },
  ]},
  { group: 'Domain 2 — Physical layer management', items: [
    { name: 'Deploying BlueField OS using BFB from the BMC', url: 'https://docs.nvidia.com/networking/display/bluefielddpuosv380/deploying+dpu+os+using+bfb+from+bmc', note: 'Installing the DPU image remotely, including bf.cfg default credentials.' },
    { name: 'BlueField modes of operation', url: 'https://docs.nvidia.com/networking/display/bluefieldbsp4110/modes+of+operation', note: 'DPU mode vs. NIC mode and what each means for the host.' },
    { name: 'Installing DOCA on the DPU', url: 'https://docs.nvidia.com/doca/sdk/installation-guide-for-linux/index.html#installing-full-doca-image-on-dpu', note: 'Full DOCA image install and verification.' },
    { name: 'Using mlxconfig', url: 'https://docs.nvidia.com/networking/display/mftv422/using+mlxconfig', note: 'Setting persistent NIC/DPU parameters such as IB vs. Ethernet link type.' },
    { name: 'MIG user guide', url: 'https://docs.nvidia.com/datacenter/tesla/mig-user-guide/index.html', note: 'Profiles, enabling MIG mode, GPU/compute instances and supported GPUs.' },
    { name: 'NVIDIA AI Enterprise — advanced GPU configuration (VMware)', url: 'https://docs.nvidia.com/ai-enterprise/deployment-guide-vmware/0.1.0/advance-gpu.html', note: 'MIG-backed vGPU and GPU partitioning in virtualised environments.' },
    { name: 'BlueField DPUs power the VAST Data platform', url: 'https://developer.nvidia.com/blog/spotlight-nvidia-bluefield-dpus-power-the-vast-data-platform-for-ai-workload-optimization/', note: 'A real storage-offload use case for BlueField.' },
  ]},
  { group: 'Domain 3 — Control plane installation and configuration', items: [
    { name: 'Base Command Manager administrator manual (PDF)', url: 'https://support.brightcomputing.com/manuals/11/admin-manual.pdf', note: 'Head node install, cmsh, categories, software images, HA and workload manager setup.' },
    { name: 'DOCA-Host installation and upgrade (PDF)', url: 'https://docs.nvidia.com/doca/sdk/doca-host-installation-and-upgrade.pdf', note: 'The host networking driver stack that replaced MLNX_OFED.' },
    { name: 'NVIDIA-Certified Systems configuration guide', url: 'https://docs.nvidia.com/certification-programs/latest/nvidia-certified-configuration-guide.html', note: 'PCIe topology, GPU/NIC placement and BIOS settings for OEM servers.' },
    { name: 'Installing the NVIDIA Container Toolkit', url: 'https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html', note: 'Repository setup, install and nvidia-ctk runtime configuration.' },
    { name: 'Specialized configurations with Docker', url: 'https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/docker-specialized.html', note: 'GPU selection, capabilities and environment variables.' },
    { name: 'Running a sample workload', url: 'https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/sample-workload.html', note: 'The docker run --gpus all … nvidia-smi validation step.' },
    { name: 'Virtual GPU client licensing user guide', url: 'https://docs.nvidia.com/grid/16.0/grid-licensing-user-guide/index.html', note: 'Licensing for vGPU deployments.' },
  ]},
  { group: 'Domain 4 — Cluster test and verification', items: [
    { name: 'DGX SuperPOD deployment guide — validation', url: 'https://docs.nvidia.com/dgx-superpod/deployment-guide-dgx-superpod/latest/validation.html', note: 'NVIDIA\'s own acceptance tests: single-node, NCCL, HPL and fabric checks.' },
    { name: 'NCCL overview', url: 'https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/overview.html', note: 'Collectives, transports and environment variables.' },
    { name: 'Cable validation — InfiniBand cluster bring-up', url: 'https://docs.nvidia.com/networking/display/infinibandclusterbringupprocedure/cable+validation', note: 'Verifying the cabling matches the plan and links are healthy.' },
    { name: 'InfiniBand port counters', url: 'https://docs.nvidia.com/networking/display/ufmsdnappumv4184/infiniband+port+counters', note: 'What symbol errors, link-downed and receive errors mean.' },
    { name: 'UFM supported port counters and events', url: 'https://docs.nvidia.com/networking/display/ufmenterpriseumv6113/Appendix+%E2%80%93+Supported+Port+Counters+and+Events', note: 'The fabric-wide view of the same counters.' },
    { name: 'ib_write_lat and perftest', url: 'https://enterprise-support.nvidia.com/s/article/ib-write-lat', note: 'Point-to-point RDMA latency tests between two hosts.' },
    { name: 'NVIDIA cable management guidelines and FAQ (PDF)', url: 'https://docs.nvidia.com/nvidia-cable-management-guidelines-and-faq.pdf', note: 'Bend radius, cleaning and handling rules that affect signal quality.' },
    { name: 'NeMo Framework overview', url: 'https://docs.nvidia.com/nemo-framework/user-guide/latest/overview.html', note: 'The training stack used for NeMo burn-in runs.' },
    { name: 'AI fabric resiliency and network convergence', url: 'https://developer.nvidia.com/blog/ai-fabric-resiliency-and-why-network-convergence-matters/', note: 'Why fabric health matters for long training jobs.' },
    { name: 'DGX best practices — storage', url: 'https://docs.nvidia.com/dgx/bp-dgx/storage.html', note: 'Local NVMe cache, shared storage and how to test them.' },
  ]},
  { group: 'Domain 5 — Troubleshoot and optimize', items: [
    { name: 'nvidia-smi documentation', url: 'https://docs.nvidia.com/deploy/nvidia-smi/index.html', note: 'Every query field, including ECC, row remapping and throttle reasons.' },
    { name: 'DCGM user guide', url: 'https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/index.html', note: 'Health watches, diagnostics levels and policies.' },
    { name: 'DCGM — debugging and troubleshooting', url: 'https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/debugging-and-troubleshooting.html', note: 'Interpreting failures and collecting evidence.' },
    { name: 'NVSM user guide', url: 'https://docs.nvidia.com/datacenter/nvsm/nvsm-user-guide/latest/', note: 'nvsm show health, dump health and component inventory on DGX.' },
    { name: 'DGX A100 service manual (PDF)', url: 'https://docs.nvidia.com/dgx/pdf/dgxa100-service-manual.pdf', note: 'Field-replaceable units and the replacement procedures.' },
    { name: 'DGX-2 ConnectX replacement', url: 'https://docs.nvidia.com/dgx/dgx2-service-manual/connectx5-replacement.html', note: 'A representative card-replacement procedure.' },
    { name: 'Choosing the right storage for enterprise AI workloads', url: 'https://developer.nvidia.com/blog/choosing-the-right-storage-for-enterprise-ai-workloads/', note: 'Storage tiers and what to tune for AI data pipelines.' },
    { name: 'RAPIDS cuDF accelerates pandas', url: 'https://developer.nvidia.com/blog/rapids-cudf-accelerates-pandas-nearly-150x-with-zero-code-changes/', note: 'On the reading list as an example of moving data work to the GPU.' },
  ]},
]

export const studyPlans = [
  { name: '3-week sprint', per: '~10 h/week', for: 'You already run NVIDIA GPU clusters day to day and need to close gaps.',
    weeks: [
      'Module 1 (Bring-up, 31%) and Module 2 (Physical layer). Take both quizzes; re-read anything under 80%.',
      'Module 3 (Control plane) and Module 4 (Verification, 33%). First full mock exam at the end of the week.',
      'Module 5 (Troubleshoot), then two more mocks. Review every wrong answer and its distractor analysis.',
    ]},
  { name: '6-week thorough', per: '~6 h/week', for: 'You have data-center or HPC experience but limited hands-on time with DGX, BCM or InfiniBand.',
    weeks: [
      'Module 1, lessons 1–3: sequence, topologies, BMC/OOB/TPM, firmware.',
      'Module 1, lessons 4–6 plus the Module 1 quiz. Module 2 (BlueField, MIG).',
      'Module 3: BCM, HA, Slurm/Enroot/Pyxis, drivers, containers. Practise the commands on any GPU box you can reach.',
      'Module 4, lessons 1–3: stress, HPL, NCCL, cable validation.',
      'Module 4, lessons 4–5 plus the quiz. Module 5. First full mock.',
      'Two more mocks, the full glossary, and the lessons behind every miss.',
    ]},
  { name: '10-week foundation', per: '~4 h/week', for: 'You are newer to AI infrastructure and want to genuinely learn it, not just pass.',
    weeks: [
      'NVIDIA\'s AI Infrastructure & Operations Fundamentals course + the glossary.',
      'Module 1, lessons 1–2.', 'Module 1, lessons 3–4.', 'Module 1, lessons 5–6 plus quiz.',
      'Module 2 plus quiz.', 'Module 3 plus quiz.',
      'Module 4, lessons 1–3.', 'Module 4, lessons 4–5 plus quiz.',
      'Module 5 plus quiz, then a first mock exam.',
      'Two more mocks and targeted review of your weakest domain.',
    ]},
]

export const examDayTips = [
  'Two domains — Bring-up (31%) and Cluster Test & Verification (33%) — are nearly two thirds of the exam. If time is short, spend it there.',
  'Read the symptom in the stem carefully and ask "which layer?" — physical (cable, transceiver, PSU), firmware, driver/service (Fabric Manager, subnet manager), or workload. Most distractors fix the wrong layer.',
  'Prefer evidence before action: check the log, counter or diagnostic that proves the fault before replacing hardware. "Replace the GPU" is rarely the first step.',
  'Know the order of operations: drain before you service, update firmware in the documented order, validate after every change, resume only after tests pass.',
  'Numbers that matter are the ones you compare against: NCCL busbw vs. line rate, HPL residual PASSED vs. FAILED, BER/symbol errors near zero, driver and Fabric Manager versions matching.',
  'Match the tool to the job: nvidia-smi (GPU state), dcgmi diag (GPU health test), nvsm (DGX system health), ipmitool/Redfish (BMC), mlxlink/ibdiagnet (links and fabric), nccl-tests (collectives), HPL (compute burn-in), fio/gdsio (storage).',
  'Watch for absolute words — "always", "never", "guarantees". They are usually the wrong option.',
  'With 70–75 questions in 120 minutes you have about 1.6 minutes each. Flag long command-output questions and come back to them.',
]

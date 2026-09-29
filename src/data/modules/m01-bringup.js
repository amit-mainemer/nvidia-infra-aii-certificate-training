export default {
  id: 'bringup',
  n: 1,
  domain: 'bringup',
  weight: 31,
  title: 'System and Server Bring-up',
  blurb: 'The largest-but-one domain: take GPU servers from a loading dock to a validated, handed-over node — site survey, AI factory networks, BMC and TPM, firmware baselines, power and cooling, cabling, hardware validation and storage onboarding.',
  hours: '6–8 h',
  lessons: [
    /* ------------------------------------------------------------------ */
    {
      id: 'deployment-sequence',
      title: 'The bring-up sequence and AI factory network topologies',
      minutes: 14,
      blocks: [
        { t: 'lede', x: 'Objectives 1.1 and 1.2 test whether you know the order of operations for deploying a GPU cluster and the four networks it is built on. Most scenario questions in this domain are "what should have happened before this step?" — so learn the sequence and the dependencies between steps.' },

        { t: 'h2', x: 'The bring-up sequence' },
        { t: 'p', x: 'The [DGX SuperPOD deployment guide](https://docs.nvidia.com/dgx-superpod/deployment-guide-dgx-superpod/latest/cluster-setup.html) and every OEM equivalent follow the same logic: nothing is powered until the facility is proven, nothing is provisioned until it is manageable, and nothing is handed to users until it has survived stress.' },
        { t: 'flow', steps: [
          { b: '1. Site survey', s: '[[site-survey|Survey]] power (kW per rack, circuit type, A/B feeds), cooling capacity and [[inlet-temp|inlet temperature]], floor load, rack depth, delivery path and network drop locations.' },
          { b: '2. Rack & stack', s: 'Receive, inspect, unbox and rail-mount the servers and switches per the rack elevation. Heavy nodes go low; mechanical lift, two or more people, [[esd|ESD]] precautions.' },
          { b: '3. Cabling', s: 'Power to A/B [[pdu|PDUs]], OOB copper, in-band, storage and compute-fabric cables per the cable plan; label both ends.' },
          { b: '4. Power-on & OOB', s: 'Energise PDUs, verify [[psu-redundancy|PSU redundancy]], bring up the [[oob|OOB]] network, give every [[bmc|BMC]] an address and change default credentials.' },
          { b: '5. Firmware baseline', s: 'Inventory versions over [[redfish|Redfish]] and bring every node, switch and adapter to the same [[fw-baseline|firmware baseline]] (BMC, BIOS, HGX tray, NICs, DPUs).' },
          { b: '6. BIOS / security', s: 'Apply BIOS settings, enable [[tpm|TPM]] and Secure Boot as required, set boot order for PXE.' },
          { b: '7. Control plane & OS', s: 'Install the head node ([[bcm|BCM]]), provision compute nodes over in-band PXE with [[dgx-os|DGX OS]] images, drivers, [[fabric-manager|Fabric Manager]], DOCA.' },
          { b: '8. Fabric bring-up', s: 'Start the [[subnet-manager|subnet manager]]/[[ufm|UFM]], confirm links at full speed, check cabling against the plan and signal quality.' },
          { b: '9. Validate & burn-in', s: 'Single-node checks ([[nvidia-smi|nvidia-smi]], [[dcgm|dcgmi diag]]), then [[nccl|NCCL]], [[hpl|HPL]] and [[burn-in|burn-in]] across the cluster.' },
          { b: '10. Handover', s: 'Record the as-built state — firmware versions, test results, cable map, known issues — and hand the cluster over for production.' },
        ]},
        { t: 'callout', kind: 'exam', title: 'Order-of-operations questions', x: [
          'OOB before in-band: you need the BMC to power-cycle, reach the console and flash firmware before any OS exists.',
          'Firmware baseline before OS provisioning and before burn-in — otherwise you burn in a configuration you are about to change.',
          'Subnet manager before any InfiniBand traffic — without it ports stay in Initializing.',
          'Single-node validation before multi-node tests: a bad GPU or NIC in one node makes every multi-node result look like a fabric problem.',
        ]},

        { t: 'h2', x: 'What the site survey must answer' },
        { t: 'table', head: ['Question', 'Why it matters for AI servers'], rows: [
          ['Power per rack and circuit type', 'A single DGX H100 is rated up to about **10.2 kW**; four per rack is >40 kW, far above a traditional 8–15 kW enterprise rack.'],
          ['Redundant A/B feeds', 'PSU redundancy is only real if the halves are on independent feeds.'],
          ['Cooling capacity and inlet temperature', 'Nearly all of that power becomes heat; air-cooled GPU servers need cold-aisle air within spec and enough airflow.'],
          ['Floor load and rack depth', 'A DGX H100 is an 8U, roughly 130 kg system that needs a deep (typically 1200 mm) rack; a populated rack can exceed standard raised-floor ratings.'],
          ['Delivery path', 'Door heights, lift capacity and ramp angles for crated systems.'],
          ['Network drops and cable pathways', 'Hundreds of fibre runs per scalable unit need tray capacity and planned routes.'],
        ]},

        { t: 'h2', x: 'The four networks of an AI factory' },
        { t: 'p', x: 'Every NVIDIA reference architecture separates traffic onto physically distinct networks so that a storm on one cannot starve another and so that management remains reachable when a data fabric is broken.' },
        { t: 'table', head: ['Network', 'Carries', 'Typical technology', 'On a DGX H100'], rows: [
          ['Compute (east-west)', 'GPU-to-GPU collectives between nodes', '[[infiniband|InfiniBand]] NDR 400 Gb/s or Spectrum-X [[roce|RoCE]], [[rail-optimized|rail-optimised]] non-blocking [[fat-tree|fat-tree]]', '8 × 400G ConnectX-7 ports, exposed via four [[twin-port-osfp|twin-port OSFP]] cages'],
          ['Storage', 'Dataset reads, checkpoints to shared storage', 'IB or high-speed Ethernet, often a separate fabric', 'Dual-port ConnectX-7 / BlueField-3 adapters'],
          ['In-band management', 'PXE provisioning, SSH, Slurm, monitoring, user access', 'Ethernet', 'In-band Ethernet port(s)'],
          ['Out-of-band (OOB)', 'BMC, switch management ports, PDUs', '1 GbE Ethernet, isolated', 'Dedicated BMC RJ-45 port'],
        ]},
        { t: 'callout', kind: 'trap', title: 'In-band vs. out-of-band', x: 'The [[inband-mgmt|in-band management network]] needs the host OS to be running; the [[oob|OOB]] network reaches the BMC with the host powered off. "Provision nodes with PXE" = in-band. "Power-cycle a hung node" or "mount an ISO remotely" = OOB.' },

        { t: 'h2', x: 'Rail-optimised compute fabric' },
        { t: 'p', x: 'In a [[rail-optimized|rail-optimised]] design, GPU *n*\'s NIC in every node connects to leaf switch *n* of its scalable unit. With eight GPUs per node there are eight rails. Most traffic in NCCL collectives (ring and tree steps between same-index GPUs) stays inside one rail, one switch hop away; traffic between rails is handled inside the node by [[nvlink|NVLink]]/[[nvswitch|NVSwitch]] or through the spine layer.' },
        { t: 'code', lang: 'text', title: 'One scalable unit, simplified', x: `           Spine layer (connects SUs, 1:1 non-blocking)
     ┌─────────┬─────────┬─────── ... ───────┬─────────┐
  Leaf R1   Leaf R2   Leaf R3     ...     Leaf R8        <- one leaf per rail
     │         │         │                   │
 node01 GPU0  GPU1      GPU2       ...      GPU7
 node02 GPU0  GPU1      GPU2       ...      GPU7
   ...
 node32 GPU0  GPU1      GPU2       ...      GPU7         <- 32 DGX H100 per SU` },
        { t: 'specs', rows: [
          ['Scalable unit (DGX H100)', '32 DGX nodes + their rail leaf switches'],
          ['Four-SU DGX H100 SuperPOD', '127 DGX nodes (one position is used by UFM)'],
          ['Compute fabric', 'NDR 400 Gb/s InfiniBand, Quantum-2 switches, 1:1 fat-tree'],
          ['Why "scalable"', 'Every SU is cabled identically, so the cluster grows by whole SUs'],
        ]},
        { t: 'p', x: '[[superpod|DGX SuperPOD]] is the full-scale reference; DGX BasePOD applies the same network separation to smaller deployments. Both use [[bcm|Base Command Manager]] for provisioning and a [[subnet-manager|subnet manager]] or [[ufm|UFM]] for the IB fabric.' },
        { t: 'callout', kind: 'tip', title: 'Label everything, both ends', x: 'A rail-optimised fabric has hundreds of near-identical cables. A cable plan with port-to-port mapping and labels on both ends is what lets you prove later (in objective 4.4) that GPU 3 of node 17 really lands on rail 4\'s leaf.' },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'bmc-oob-tpm',
      title: 'BMC, out-of-band management and TPM',
      minutes: 13,
      blocks: [
        { t: 'lede', x: 'Objective 1.3 — "Perform initial configuration of BMC, OOB, and TPM" — is the first hands-on step after power-on. Expect command-level questions on ipmitool and Redfish, and conceptual ones on why OOB is isolated and when TPM must be enabled.' },

        { t: 'h2', x: 'What the BMC gives you' },
        { t: 'ul', items: [
          'Remote power control (on, off, reset, power cycle) independent of the host OS.',
          'Sensors and thresholds — the [[sdr|SDR]] — for temperatures, fans, voltages and PSUs.',
          'The [[sel|System Event Log]], which survives reboots and OS crashes.',
          'Remote console (KVM) and [[virtual-media|virtual media]] to install an OS or enter BIOS setup.',
          'Firmware inventory and updates via [[redfish|Redfish]] (and on HGX, a path to the [[hmc|HMC]]).',
        ]},

        { t: 'h2', x: 'Initial BMC configuration checklist' },
        { t: 'ol', items: [
          'Connect the dedicated BMC port to the OOB switch (not a shared NIC, unless the design says so).',
          'Set a **static IP** (or a DHCP reservation keyed on the BMC MAC) from the OOB address plan.',
          'Change the **default/factory credentials** immediately; create named admin accounts where possible.',
          'Set NTP and time zone so SEL timestamps line up with host logs.',
          'Check sensors and clear/record the SEL as the baseline for this node.',
          'Record BMC firmware version; plan the update to the cluster baseline.',
          'Disable unused services (e.g. IPMI-over-LAN if policy requires Redfish only).',
        ]},
        { t: 'code', lang: 'bash', title: 'BMC network and user setup with ipmitool (from the host OS)', x: `# View current LAN settings on channel 1
sudo ipmitool lan print 1

# Static addressing for the BMC
sudo ipmitool lan set 1 ipsrc static
sudo ipmitool lan set 1 ipaddr 10.0.100.21
sudo ipmitool lan set 1 netmask 255.255.255.0
sudo ipmitool lan set 1 defgw ipaddr 10.0.100.1

# Change the admin password (user ID from 'user list')
sudo ipmitool user list 1
sudo ipmitool user set password 2 'N3w-Str0ng-Pass'

# If the BMC misbehaves after changes, restart the BMC only (host keeps running)
sudo ipmitool mc reset cold` },
        { t: 'code', lang: 'bash', title: 'Remote health checks over the OOB network', x: `BMC="-I lanplus -H 10.0.100.21 -U admin -P secret"

ipmitool $BMC chassis power status
ipmitool $BMC sdr type Temperature          # current sensor readings
ipmitool $BMC sensor list | grep -iE 'fan|psu'
ipmitool $BMC sel elist                     # event log with decoded timestamps
ipmitool $BMC chassis power cycle           # hard power cycle of the host` },

        { t: 'h2', x: 'IPMI vs. Redfish' },
        { t: 'vs', cards: [
          { h: 'IPMI (ipmitool)', items: [
            'Older binary protocol (RMCP+ / lanplus over UDP 623)',
            'Great for quick one-offs: power, SEL, SDR, LAN config',
            'Limited, vendor-specific firmware update support',
            'Weaker security model; often disabled by policy',
          ]},
          { h: 'Redfish', items: [
            'DMTF REST/JSON over HTTPS',
            'Inventory, telemetry, logs, power, virtual media, firmware (UpdateService)',
            'Scriptable across hundreds of BMCs; basis of nvfwupd and BCM integrations',
            'The preferred interface for automation at scale',
          ]},
        ]},
        { t: 'code', lang: 'bash', title: 'Redfish equivalents with curl', x: `BMC=https://10.0.100.21
AUTH="-k -u admin:secret"

curl $AUTH $BMC/redfish/v1/Systems                     # list systems
curl $AUTH $BMC/redfish/v1/Chassis                     # chassis, incl. HGX tray
curl $AUTH $BMC/redfish/v1/UpdateService/FirmwareInventory   # firmware versions
curl $AUTH $BMC/redfish/v1/Managers/BMC/LogServices    # SEL and other logs

# Graceful restart of the host
curl $AUTH -X POST -H 'Content-Type: application/json' \\
  -d '{"ResetType":"GracefulRestart"}' \\
  $BMC/redfish/v1/Systems/DGX/Actions/ComputerSystem.Reset` },
        { t: 'callout', kind: 'tip', title: 'Resource names vary', x: 'The top-level paths (`/redfish/v1/Systems`, `/Chassis`, `/Managers`, `/UpdateService`) are standard; the member IDs beneath them (`DGX`, `BMC`, `HGX_…`) differ by platform. Always GET the collection first and follow the links.' },

        { t: 'h2', x: 'Why OOB is a separate network' },
        { t: 'p', x: 'The [[oob|OOB]] network is the lifeline when everything else is broken: a kernel panic, a mis-configured in-band VLAN, a fabric outage. It is kept physically or logically isolated because BMCs are high-value targets — BMC access equals console access, power control and firmware flashing. Good practice: a dedicated 1 GbE switch layer, no route from user networks, access only from jump hosts or the head node.' },
        { t: 'callout', kind: 'trap', title: 'Shared vs. dedicated BMC port', x: 'Some servers can share the BMC over a host NIC (NC-SI). It saves a cable but ties BMC reachability to that NIC and the in-band network. For AI clusters the reference designs use the **dedicated** BMC port on the OOB network.' },

        { t: 'h2', x: 'TPM enablement' },
        { t: 'p', x: 'The [[tpm|TPM]] stores keys and boot measurements used by measured boot, Secure Boot attestation and disk encryption (e.g. LUKS keys sealed to the TPM). It must be enabled in BIOS/UEFI **before** the OS is installed if the OS install will use it — encryption and attestation are set up at install time.' },
        { t: 'flow', steps: [
          { b: 'BIOS setup', s: 'Reach setup via KVM; under Security / Trusted Computing enable the TPM (TPM 2.0) and, if required, Secure Boot.' },
          { b: 'Clear/own if required', s: 'Clearing the TPM destroys keys sealed to it — only do so on a new system or when policy requires.' },
          { b: 'Save & reboot', s: 'Persist the settings; some changes require a full power cycle.' },
          { b: 'Verify from the OS', s: 'Check the device exists and reports version 2.' },
        ]},
        { t: 'code', lang: 'bash', title: 'Verifying the TPM from Linux', x: `ls /dev/tpm*                                  # /dev/tpm0 and /dev/tpmrm0
cat /sys/class/tpm/tpm0/tpm_version_major     # 2
sudo tpm2_getcap properties-fixed | head      # tpm2-tools package
mokutil --sb-state                            # Secure Boot enabled/disabled` },
        { t: 'callout', kind: 'exam', title: 'What to remember', x: [
          'Order: OOB cabling → BMC static IP → change default credentials → sensors/SEL baseline → firmware → BIOS (TPM, Secure Boot, PXE boot order) → OS.',
          '`ipmitool mc reset cold` restarts the BMC, not the host. `chassis power cycle` restarts the host.',
          'Redfish is the automation answer; IPMI is the quick CLI answer.',
          'Clearing the TPM after OS install breaks anything sealed to it (e.g. TPM-bound disk encryption).',
        ]},
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'firmware',
      title: 'Firmware upgrades on HGX systems and fault detection',
      minutes: 14,
      blocks: [
        { t: 'lede', x: 'Objective 1.4 — "Perform firmware upgrades (including on HGX systems) and fault detection." Firmware is where bring-up most often goes wrong: partially applied updates, skipped activation and mixed versions across nodes. Know the tool, the order and how to prove the result.' },

        { t: 'h2', x: 'Components that carry firmware' },
        { t: 'table', head: ['Component', 'Updated via', 'Notes'], rows: [
          ['BMC', 'BMC web UI, Redfish, [[nvfwupd|nvfwupd]]', 'Usually updated first — it runs the rest of the update flow'],
          ['System BIOS/UEFI', 'Redfish / nvfwupd via BMC', 'Settings may be reset to defaults; re-apply BIOS profile'],
          ['[[hgx|HGX]] tray (GPUs, NVSwitch, FPGA/CPLD, retimers)', 'Bundle via BMC → [[hmc|HMC]]', 'Updated as a coordinated set, not GPU by GPU'],
          ['CPLDs, PSUs, midplane', 'BMC bundle', 'Frequently need an AC power cycle to activate'],
          ['ConnectX / BlueField', '[[mlxlink|mlxfwmanager / flint]], DOCA bundles', 'NIC firmware activation needs a reset (mlxfwreset) or reboot'],
          ['NVMe drives', 'Vendor tool / nvme-cli / DGX firmware bundle', 'Part of the DGX firmware package'],
        ]},

        { t: 'h2', x: 'The DGX / HGX update flow' },
        { t: 'p', x: 'Current DGX systems (see the [DGX B200 firmware update guide](https://docs.nvidia.com/dgx/dgxb200-fw-update-guide/)) are updated with [[nvfwupd|nvfwupd]], which runs on a management host (or the node itself) and drives the update through the BMC\'s Redfish interface using a signed `.fwpkg` package.' },
        { t: 'flow', steps: [
          { b: 'Prepare', s: 'Read the release notes for the target [[fw-baseline|baseline]]; drain the node from the scheduler; stop GPU workloads; capture current versions.' },
          { b: 'Check versions', s: '`nvfwupd … show_version` compares installed firmware against the package and flags what is out of date.' },
          { b: 'Update in order', s: 'Typically BMC first, then the remaining components (BIOS, HGX tray, CPLDs, etc.) as the guide specifies. Do not interrupt power while flashing.' },
          { b: 'Activate', s: 'Apply the reset the guide requires — host reboot, BMC reset, or a full [[fw-activation|AC power cycle]].' },
          { b: 'Verify', s: 'Run `show_version` again; every component should match the package. Check the SEL and nvidia-smi for errors.' },
          { b: 'Return to service', s: 'Re-apply BIOS settings if reset, run a quick diag, resume the node.' },
        ]},
        { t: 'code', lang: 'bash', title: 'nvfwupd — typical usage', x: `# What is installed vs. what the package contains
nvfwupd -t ip=10.0.100.21 user=admin password=secret \\
        show_version -p nvfw_DGX_<version>.fwpkg

# Apply the package (all applicable components)
nvfwupd -t ip=10.0.100.21 user=admin password=secret \\
        update_fw -p nvfw_DGX_<version>.fwpkg -y

# Optional: a JSON file (-s) can target specific components
nvfwupd -t ip=10.0.100.21 user=admin password=secret \\
        update_fw -p nvfw_DGX_<version>.fwpkg -s update_params.json

# After the required power cycle — confirm
nvfwupd -t ip=10.0.100.21 user=admin password=secret \\
        show_version -p nvfw_DGX_<version>.fwpkg` },
        { t: 'code', lang: 'bash', title: 'Cross-checking versions from the host and Redfish', x: `nvidia-smi -q | grep -iE 'VBIOS|Driver Version'
sudo dmidecode -s bios-version
sudo ipmitool mc info | grep 'Firmware Revision'
curl -k -u admin:secret \\
  https://10.0.100.21/redfish/v1/UpdateService/FirmwareInventory?\\$expand=.
sudo mlxfwmanager --query                      # ConnectX / BlueField firmware` },
        { t: 'callout', kind: 'trap', title: '"Update succeeded" but the version is unchanged', x: 'The image is staged but not active. A warm OS reboot does not restart standby-powered controllers on the HGX tray, CPLDs or PSUs. Perform the activation the guide requires — usually an **AC power cycle** (all PSUs unplugged or PDU outlets switched off, wait, restore) — then verify again.' },
        { t: 'callout', kind: 'warn', title: 'Never interrupt a flash', x: 'Losing power or resetting the BMC mid-update can leave a component unbootable. Batch updates by rack with power stable, and do not start a cluster-wide update from a script without checking each node\'s task status.' },

        { t: 'h2', x: 'Why the HGX tray is a bundle' },
        { t: 'p', x: 'On an [[hgx|HGX]] baseboard the GPUs, [[nvswitch|NVSwitch]] chips, FPGA and retimers are validated together; mixing versions can break NVLink training or fabric initialisation. The [[hmc|HMC]] owns this inventory and applies the tray bundle as one operation. Also keep the host software aligned: the GPU driver and [[fabric-manager|Fabric Manager]] versions must match, and the firmware baseline states which driver branch it was tested with.' },
        { t: 'callout', kind: 'exam', title: 'Consistency across the cluster', x: 'Before burn-in, every node should report the same versions. A single node with older NIC or GPU firmware is a finding in itself — it can cause subtle NCCL or link-training differences that only show up at scale.' },

        { t: 'h2', x: 'Fault detection during bring-up' },
        { t: 'p', x: 'Fault detection at this stage is about catching hardware that arrived broken or was damaged during installation, before the OS stack hides the evidence.' },
        { t: 'table', head: ['Source', 'Command', 'Look for'], rows: [
          ['BMC event log', '`ipmitool sel elist` / Redfish LogServices', 'PSU failure or input lost, fan faults, thermal trips, memory/PCIe errors'],
          ['BMC sensors', '`ipmitool sdr` / `sensor list`', 'Readings outside thresholds, missing sensors (component not detected)'],
          ['DGX health', '[[nvsm|`nvsm show health`]]', 'Any non-healthy item: GPUs, drives, PSUs, fans, NICs'],
          ['GPU state', '[[nvidia-smi|`nvidia-smi`]], `nvidia-smi -q -d ECC`', 'Missing GPUs, [[ecc|ECC]] errors, pending/failed row remaps'],
          ['Kernel log', '`dmesg | grep -i xid`', '[[xid|Xid]] events such as 79 (fell off the bus) or 74 (NVLink)'],
          ['Firmware', '`nvfwupd show_version`', 'Components out of baseline or failed updates'],
        ]},
        { t: 'callout', kind: 'tip', title: 'Collect before you change', x: 'When something is wrong, capture evidence first — `nvsm dump health` on a DGX or [[nvidia-bug-report|nvidia-bug-report.sh]] — before reseating or reflashing. The support case will ask for it, and a reboot can clear volatile state.' },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'power-cooling-install',
      title: 'Power, cooling and installing GPU servers',
      minutes: 14,
      blocks: [
        { t: 'lede', x: 'Objectives 1.5 (validate power and cooling), 1.6 (install GPU-based servers) and 1.9 (install physical GPUs). The exam wants you to reason about capacity and redundancy with real numbers, and to know the physical handling rules that prevent damage.' },

        { t: 'h2', x: 'Power: budgeting from the maximum' },
        { t: 'p', x: 'Size power from the system\'s **maximum** rated draw, not typical usage — HPL and burn-in will drive systems to their limits. The [DGX H100 user guide](https://docs.nvidia.com/dgx/dgxh100-user-guide/quickstart-basics.html) lists about **10.2 kW** maximum per system, delivered through multiple hot-swappable 3.3 kW PSUs.' },
        { t: 'table', head: ['Example rack', 'Max IT load', 'Implication'], rows: [
          ['1 × DGX H100', '≈10.2 kW', 'Already at or above many legacy rack budgets'],
          ['2 × DGX H100', '≈20.4 kW', 'Needs high-density circuits; typical for air-cooled halls'],
          ['4 × DGX H100', '≈40.8 kW', 'Only in facilities designed for high density; cooling becomes the limit'],
        ]},
        { t: 'h3', x: 'Redundancy and A/B feeds' },
        { t: 'p', x: '[[psu-redundancy|PSU redundancy]] is expressed as N+1 or N+N. N+N is only meaningful if the two halves of the PSUs are fed from independent [[pdu|PDUs]] on independent upstream circuits (A and B feeds). Each feed must be able to carry the full rack load alone, otherwise losing one feed overloads the other.' },
        { t: 'callout', kind: 'trap', title: 'Redundant on paper only', x: [
          'All PSU cords in one PDU: the BMC reports all PSUs present and healthy, but a single breaker trip takes the node down.',
          'A/B PDUs each loaded to 70%: fine in normal operation, but losing one feed puts 140% on the other and trips it — a cascading outage.',
          'A PSU missing or failed: the system may cap power or throttle GPUs; check `ipmitool sdr` / `nvsm show health` for PSU state before burn-in.',
        ]},
        { t: 'code', lang: 'bash', title: 'Checking power from the BMC and host', x: `ipmitool $BMC sdr type 'Power Supply'     # presence and status of each PSU
ipmitool $BMC dcmi power reading           # current system power draw
nvsm show health                           # DGX: PSUs, fans, thermals in one view
nvidia-smi --query-gpu=index,power.draw,power.limit,clocks_throttle_reasons.active --format=csv` },

        { t: 'h2', x: 'Cooling: air vs. liquid' },
        { t: 'vs', cards: [
          { h: 'Air-cooled (DGX H100 / B200, most HGX)', items: [
            'Front-to-back airflow: cold aisle in, hot aisle out',
            'Governed by [[inlet-temp|inlet air temperature]] (DGX H100 operating range tops out around 30 °C)',
            'Needs blanking panels, sealed cable cut-outs, hot/cold aisle containment',
            'Fan speeds rise with load; high inlet temperature → throttling',
          ]},
          { h: 'Liquid-cooled (e.g. GB200 NVL72)', items: [
            '[[dlc|Direct liquid cooling]] cold plates plus a CDU to facility water',
            'Bring-up adds leak checks, fill/bleed, flow and pressure verification',
            'Rack densities far beyond what air can remove',
            'CDU alarms and leak sensors join the monitoring set',
          ]},
        ]},
        { t: 'callout', kind: 'exam', title: 'Diagnosing cooling problems', x: [
          'GPUs in the top nodes of a rack run hotter or throttle → hot-air recirculation; check blanking panels and containment.',
          'One node much hotter than identical neighbours → that node (fan failure, blocked intake, reversed airflow part), not the room.',
          'A switch installed with the wrong airflow direction (port-side intake vs. exhaust) blows hot air into the cold aisle — switch fan/PSU modules come in both directions; match the aisle layout.',
        ]},
        { t: 'code', lang: 'bash', title: 'Thermal checks', x: `ipmitool $BMC sdr type Temperature
ipmitool $BMC sdr type Fan
nvidia-smi --query-gpu=index,temperature.gpu,temperature.memory,fan.speed --format=csv
nvidia-smi -q -d PERFORMANCE     # Clocks Event Reasons: HW Slowdown, Thermal, Power Cap` },

        { t: 'h2', x: 'Installing GPU servers (1.6)' },
        { t: 'ol', items: [
          'Inspect crates for tilt/shock indicators; photograph damage before unpacking.',
          'Verify the rack elevation: heaviest systems low, clear space for the full rail length and rear cabling.',
          'Install rails at the correct U positions; confirm front/rear posts are at the depth the rails need.',
          'Lift with a mechanical lift or the number of people the guide requires — a DGX H100 weighs roughly 130 kg. Some guides call for removing PSUs/modules to reduce weight.',
          'Slide in, lock rails, secure to the rack; install any removed modules.',
          'Connect power to A and B PDUs, then OOB, in-band, storage and compute cables per the cable plan.',
        ]},

        { t: 'h2', x: 'Installing physical GPUs (1.9)' },
        { t: 'p', x: 'For SXM systems the GPUs live on the [[hgx|HGX]] baseboard and are field-replaced per the service guide. For PCIe GPUs in [[nvidia-certified|NVIDIA-Certified]] servers you install cards yourself — and placement matters.' },
        { t: 'ul', items: [
          '**ESD first:** power off, remove AC power, wear a grounded strap, work on an ESD mat, handle cards by the bracket and edges ([[esd|ESD protection]]).',
          '**Seat fully:** the card must be flush in an x16 slot and locked by the retention bracket; use the correct riser.',
          '**Auxiliary power:** connect the correct GPU power cable (e.g. 12VHPWR/12V-2x6 or 8-pin, per the server) — never improvise adapters.',
          '**Slot placement:** follow the configuration guide so GPUs are balanced across CPU sockets and each GPU shares a PCIe switch or socket with its NIC ([[numa-affinity|NUMA/PCIe affinity]]).',
          '**Airflow:** passively cooled data-center GPUs depend on server fans; keep shrouds and baffles, fill empty slots with blanks.',
        ]},
        { t: 'callout', kind: 'trap', title: 'Card in, link degraded', x: 'A GPU that is detected but negotiates a lower PCIe generation or width (e.g. x8 instead of x16) usually means a poorly seated card, the wrong riser or slot, or a BIOS bifurcation setting. Check `lspci -vvv` LnkSta vs. LnkCap.' },
        { t: 'code', lang: 'bash', title: 'Confirming a freshly installed PCIe GPU', x: `lspci | grep -i nvidia
sudo lspci -vvv -s <bus:dev.fn> | grep -E 'LnkCap|LnkSta'   # expect full speed & x16
nvidia-smi -L
nvidia-smi topo -m          # GPU ↔ NIC relationship and NUMA affinity` },
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'cables-transceivers',
      title: 'Cable types and transceivers',
      minutes: 12,
      blocks: [
        { t: 'lede', x: 'Objective 1.8 — "Describe and validate cable types and transceivers." The exam expects you to pick the right medium for a distance, recognise the form factors on DGX and Quantum-2 hardware, and know the handling rules that keep links error-free. The [NVIDIA cabling guide for data centers](https://docs.nvidia.com/cabling-data-centers.pdf) is the reference.' },

        { t: 'h2', x: 'The four media, by reach' },
        { t: 'table', head: ['Type', 'What it is', 'Reach (400G class)', 'Use'], rows: [
          ['DAC', 'Passive direct-attach copper; no electronics in the cable', 'Shortest — a couple of metres at most', 'In-rack: server to top-of-rack leaf, switch to switch in one rack'],
          ['ACC', 'Active copper: signal conditioning in the ends', 'Somewhat longer than DAC', 'Adjacent racks when DAC is too short'],
          ['AOC', 'Active optical cable: optics bonded to fixed-length fibre', 'Tens of metres', 'Within a row; simple, but whole cable replaced on failure'],
          ['Transceiver + fibre', 'Pluggable optical module plus separate patch fibre (MPO)', 'Tens of metres (multimode) to km (single-mode)', 'Row- and hall-scale links, structured cabling'],
        ]},
        { t: 'p', x: 'All four belong to NVIDIA\'s [[linkx|LinkX]] family. Copper is cheapest and lowest power but thick, heavy and short; optics cost more and draw more power but reach further and are easier to route.' },

        { t: 'h2', x: 'Form factors: OSFP and QSFP' },
        { t: 'vs', cards: [
          { h: 'OSFP', items: [
            'Larger cage, more power and thermal headroom',
            'Quantum-2 NDR switches: twin-port OSFP (2 × 400G per cage)',
            'DGX H100 compute fabric: 4 twin-port OSFP cages = 8 × 400G ConnectX-7 links',
            'Finned-top modules for switches; flat-top for cages with riding heat sinks',
          ]},
          { h: 'QSFP (QSFP56 / QSFP112)', items: [
            'Smaller cage, common on PCIe adapter cards and Ethernet switches',
            'QSFP112 = 400G on some ConnectX-7 adapter variants',
            'Not mechanically interchangeable with OSFP',
            'Check the cage at both ends before ordering',
          ]},
        ]},
        { t: 'callout', kind: 'trap', title: 'One cage, two links', x: 'A [[twin-port-osfp|twin-port OSFP]] module carries **two** independent 400G links, each on its own MPO fibre. A single cage with one link up and one down usually means one fibre is dirty, unseated or crossed — not a failed module. Also, the switch-side and host-side modules are different part numbers (finned vs. flat top); using the wrong one can mean poor cooling or a module that does not seat.' },

        { t: 'h2', x: 'Fibre: multimode vs. single-mode' },
        { t: 'table', head: ['', 'Multimode (MMF)', 'Single-mode (SMF)'], rows: [
          ['Jacket colour (typical)', 'Aqua (OM3/OM4) or lime (OM5)', 'Yellow'],
          ['Optics', 'SR (850 nm, VCSEL)', 'DR / FR (1310 nm)'],
          ['Reach', 'Tens of metres (about 50 m for 400G SR4 on OM4)', 'Hundreds of metres (DR) to kilometres (FR)'],
          ['Connector', 'MPO, flat polish (UPC)', 'MPO, angled polish (APC) typical'],
          ['Cost', 'Cheaper optics', 'More expensive optics, cheaper fibre per metre'],
        ]},
        { t: 'callout', kind: 'exam', title: 'Matching rule', x: 'The transceiver, the fibre type and the connector polish must all match. [[mmf-smf|SR optics need multimode; DR/FR optics need single-mode]]. APC and UPC connectors must not be mated — the angled and flat end-faces damage each other and produce high loss.' },

        { t: 'h2', x: 'Handling and installation rules' },
        { t: 'ul', items: [
          '**Clean and inspect** every fibre end-face before insertion (one-click cleaner, inspection scope). Dust is the most common cause of optical link errors.',
          '**Keep dust caps on** unused modules and fibres.',
          'Respect the [[bend-radius|minimum bend radius]]; no sharp bends at the cage, no over-tight zip ties — use hook-and-loop straps.',
          'Support DAC weight; heavy copper hanging from a cage strains the connector.',
          'Insert until it clicks; pull by the pull-tab only.',
          'Label both ends and follow the cable plan so rails and ports can be verified later.',
        ]},

        { t: 'h2', x: 'Validating cables and transceivers' },
        { t: 'code', lang: 'bash', title: 'Host-side checks (ConnectX / DGX)', x: `sudo mst start
sudo mst status -v                      # map mlx5_N devices to PCI addresses
ibstat                                  # State: Active, Physical state: LinkUp, Rate: 400
ibdev2netdev                            # which netdev belongs to which mlx5 device

# Cable/module identity, link speed, and signal quality
sudo mlxlink -d mlx5_0 -m               # module info: vendor, part number, cable type, length
sudo mlxlink -d mlx5_0                  # operational speed, FEC, troubleshooting info
sudo mlxlink -d mlx5_0 -c               # counters incl. BER / symbol errors
sudo mlxlink -d mlx5_0 --show_ber` },
        { t: 'p', x: '[[mlxlink|mlxlink]] reads the module EEPROM (vendor, part number, length, cable type) so you can confirm the installed part is the planned one, and reports link state, speed and [[ber|BER]]. Healthy links show the expected speed, no physical-layer errors and effective BER at or near zero. Fabric-wide, [[ufm|UFM]] provides the same view across every port; module 4 covers signal-quality validation in depth.' },
        { t: 'callout', kind: 'tip', title: 'Symptom → likely cause', x: [
          'No link at all → wrong module type, unseated cable, fibre polarity/crossed pair, SM not running (IB logical state).',
          'Link at lower speed than planned → wrong cable/module part, or port speed configuration.',
          'Link up but symbol errors rising → dirty end-face, excessive bend, damaged cable; clean, reseat, then replace.',
        ]},
      ],
    },

    /* ------------------------------------------------------------------ */
    {
      id: 'hw-validation-storage',
      title: 'Validating hardware and configuring third-party storage',
      minutes: 15,
      blocks: [
        { t: 'lede', x: 'Objectives 1.7 (validate installed hardware), 1.10 (validate hardware operation for workloads) and 1.11 (initial parameters for third-party storage). This is the checkpoint between "installed" and "ready for burn-in": prove every component is present, correctly connected, at full speed and able to run real GPU work, then connect it to shared storage.' },

        { t: 'h2', x: 'Layer by layer: is everything there?' },
        { t: 'table', head: ['Check', 'Command', 'Expected on an 8-GPU HGX/DGX node'], rows: [
          ['GPUs on the PCIe bus', '`lspci | grep -i nvidia`', '8 GPUs plus NVSwitch devices listed'],
          ['GPUs seen by the driver', '`nvidia-smi -L`', '8 GPUs with serials/UUIDs'],
          ['PCIe link speed/width', '`lspci -vvv -s <bdf> | grep LnkSta`', 'Full generation and x16 for each GPU/NIC'],
          ['NVLink', '`nvidia-smi nvlink -s`', 'All links active at the expected rate'],
          ['Fabric Manager', '`systemctl status nvidia-fabricmanager`', 'active (running); version = driver version'],
          ['Topology', '`nvidia-smi topo -m`', 'NV# between GPUs; each GPU PIX/PXB to its NIC'],
          ['NICs', '`ibstat`, `ibdev2netdev`', 'All compute ports Active at 400 Gb/s'],
          ['Memory & CPUs', '`free -g`, `lscpu`, `dmidecode -t memory`', 'Full DIMM population and core count'],
          ['Drives', '`lsblk`, `nvme list`', 'OS drives plus NVMe cache (e.g. /raid on DGX)'],
          ['System health', '[[nvsm|`nvsm show health`]]', 'All items healthy'],
        ]},

        { t: 'h2', x: 'Reading nvidia-smi topo -m' },
        { t: 'code', lang: 'text', title: 'Excerpt (illustrative)', x: `        GPU0  GPU1  ...  GPU7  NIC0  NIC1  ...  CPU Affinity  NUMA Affinity
GPU0     X    NV18  ...  NV18  PXB   SYS   ...  0-55          0
GPU1    NV18   X    ...  NV18  SYS   PXB   ...  0-55          0
...
Legend:
  X    = Self
  SYS  = crosses the inter-socket link (QPI/UPI/Infinity Fabric)
  NODE = within one NUMA node, across PCIe host bridges
  PHB  = through a PCIe host bridge (CPU)
  PXB  = through multiple PCIe bridges, not the host bridge
  PIX  = at most a single PCIe bridge
  NV#  = bonded set of # NVLinks` },
        { t: 'callout', kind: 'exam', title: 'What the matrix proves', x: [
          'GPU↔GPU: every pair should show **NV#** on an NVSwitch system. A pair showing SYS or PHB means NVLink/NVSwitch is not working for that GPU.',
          'GPU↔NIC: the NIC each GPU uses for [[rdma|GPUDirect RDMA]] should be PIX or PXB. SYS means traffic crosses sockets — wrong slot placement on a PCIe server ([[numa-affinity|NUMA affinity]]).',
          'Expect NICs to be present in the matrix only if the network driver stack is loaded.',
        ]},

        { t: 'h2', x: 'Is it healthy? Active diagnostics' },
        { t: 'code', lang: 'bash', title: 'DCGM, NVSM and GPU error state', x: `dcgmi discovery -l                     # DCGM sees all GPUs and NVSwitches
dcgmi diag -r 1                        # quick sanity (seconds)
dcgmi diag -r 3                        # extended: PCIe, memory, compute stress (minutes)

nvidia-smi -q -d ECC                   # volatile/aggregate ECC counters
nvidia-smi -q -d ROW_REMAPPER          # pending / failed remaps
dmesg -T | grep -i xid                 # any Xid since boot

nvsm show health                       # DGX system-level summary
nvsm dump health                       # support bundle if anything fails` },
        { t: 'p', x: '[[dcgm|DCGM]] level 1 is a deployment sanity check; level 3 is the standard hardware validation before burn-in. Any failure — a GPU below bandwidth, an [[ecc|ECC]] or [[xid|Xid]] event, a pending row remap — must be resolved before the node joins multi-node testing.' },

        { t: 'h2', x: 'Validating hardware operation for workloads (1.10)' },
        { t: 'p', x: 'Present and healthy is not the same as usable. Prove the software path that real jobs will use: driver + CUDA, container runtime, NVLink collectives and the network stack.' },
        { t: 'flow', steps: [
          { b: 'CUDA in a container', s: '`docker run --rm --gpus all nvcr.io/nvidia/cuda:<tag>-base-ubuntu22.04 nvidia-smi` — proves driver + [[container-toolkit|Container Toolkit]].' },
          { b: 'Intra-node collectives', s: 'Single-node [[nccl|NCCL]] `all_reduce_perf -b 8 -e 8G -f 2 -g 8`; [[busbw|busbw]] should approach the NVLink figure for the platform.' },
          { b: 'NIC path', s: '[[perftest|ib_write_bw]] between two nodes per rail confirms each NIC reaches line rate.' },
          { b: 'Representative job', s: 'A short training run or benchmark from an [[ngc|NGC]] container under the scheduler.' },
        ]},
        { t: 'callout', kind: 'trap', title: 'CUDA says "system not yet initialized"', x: 'On an NVSwitch-based node this almost always means [[fabric-manager|Fabric Manager]] is not running or does not match the driver version — not a GPU fault. Fix the service before replacing hardware.' },

        { t: 'h2', x: 'Third-party storage: initial parameters (1.11)' },
        { t: 'p', x: 'DGX systems use local NVMe (mounted at `/raid`) as a cache, but datasets and checkpoints live on shared storage — NFS appliances or a [[parallel-fs|parallel file system]] (Lustre, IBM Storage Scale, WEKA, VAST, DDN). Initial configuration is mostly client-side and follows the vendor\'s NVIDIA-validated guidance.' },
        { t: 'table', head: ['Parameter', 'What to set / check'], rows: [
          ['Network', 'Storage traffic on the storage fabric (or the adapters the reference design assigns), not on in-band management'],
          ['Link layer & MTU', '[[mtu|Jumbo frames]] (e.g. 9000) end to end on Ethernet; IB MTU 4096; must match host, switches and array'],
          ['RDMA', 'NFS over RDMA, Lustre o2ib LNet, or the vendor\'s RDMA client — needs the DOCA/OFED stack'],
          ['Mount options', '[[nfs-rdma|nconnect, proto=rdma, rsize/wsize]], `hard`, NFS version per vendor'],
          ['Client software', 'Vendor client/kernel module version compatible with the OS kernel and DOCA version'],
          ['GPUDirect Storage', 'Optional: [[gds|GDS]] support in the file system client; verify with gdscheck'],
          ['Caching', 'FS-Cache (cachefilesd) on /raid for NFS read caching on DGX, if used'],
        ]},
        { t: 'code', lang: 'bash', title: 'Examples', x: `# NFS over TCP with multiple connections and 1 MiB I/O
sudo mount -t nfs -o vers=3,nconnect=16,rsize=1048576,wsize=1048576,hard \\
     10.20.0.10:/datasets /mnt/datasets

# NFS over RDMA (standard NFS/RDMA port 20049)
sudo mount -t nfs -o vers=3,proto=rdma,port=20049,rsize=1048576,wsize=1048576 \\
     10.20.0.10:/datasets /mnt/datasets

# Verify MTU end to end on a 9000-byte path (8972 = 9000 - IP/ICMP headers)
ping -M do -s 8972 -c 3 10.20.0.10

# Lustre over InfiniBand
sudo lnetctl net show                  # o2ib network configured
sudo mount -t lustre 10.30.0.2@o2ib:/fs1 /lustre

# GPUDirect Storage readiness
/usr/local/cuda/gds/tools/gdscheck -p` },
        { t: 'callout', kind: 'trap', title: 'Classic storage misconfigurations', x: [
          'MTU 9000 on hosts but 1500 on a switch hop: small files fine, large reads hang or crawl.',
          'Storage mounted over the in-band management interface: works, but at a fraction of expected bandwidth and competing with provisioning traffic.',
          'proto=rdma requested but the RDMA stack/modules are not loaded: mount fails or falls back depending on client.',
        ]},
        { t: 'callout', kind: 'exam', title: 'Where this leads', x: 'Storage throughput testing ([[fio|fio]], gdsio) and burn-in belong to module 4. For objective 1.11 the questions are about **setting it up right**: correct fabric, matching MTU, RDMA enabled and vendor-recommended mount options.' },
      ],
    },
  ],

  /* ==================================================================== */
  quiz: [
    { id: 'b01', domain: 'bringup',
      scenario: 'A team receives 16 DGX H100 systems. The racks are installed and power is connected. The facilities team asks what to do next before anyone installs an operating system.',
      q: 'Which step comes next in a standard bring-up sequence?',
      opts: [
        'Run HPL on each node to confirm power delivery',
        'Bring up the OOB network, assign BMC addresses and change default BMC credentials',
        'Install BCM on the head node and PXE-boot all compute nodes',
        'Start the InfiniBand subnet manager and run multi-node NCCL tests'],
      a: 1,
      why: 'After power-on the first thing to establish is out-of-band manageability: BMC reachability, addressing and secure credentials. The BMC is then used for firmware baselining, BIOS/TPM setup and remote console before any OS work.',
      distract: '**HPL** and **NCCL** are validation/burn-in steps that need an OS, drivers and firmware. **BCM/PXE** provisioning comes after the firmware baseline and BIOS configuration, which themselves require the BMC.' },

    { id: 'b02', domain: 'bringup',
      q: 'In a rail-optimised compute fabric with eight GPUs per node, how are the NICs cabled?',
      opts: [
        'All eight NICs of a node connect to the same leaf switch to minimise hops',
        'NICs are cabled round-robin across spine switches',
        'The NIC for GPU n in every node connects to leaf switch n (rail n) of the scalable unit',
        'Each node connects one NIC to the fabric and relies on NVLink for the others'],
      a: 2,
      why: 'Rail optimisation puts same-index GPUs from all nodes on the same leaf, so the bulk of collective traffic between corresponding GPUs stays one switch hop away. Eight GPUs per node means eight rails.',
      distract: 'Putting a whole node on one leaf concentrates traffic and removes the rail benefit. Nodes attach to leaves, not directly to spines. Every GPU has its own 400G NIC on a DGX H100; one NIC per node would starve the fabric.' },

    { id: 'b03', domain: 'bringup',
      scenario: 'A node kernel-panics and the in-band management network cannot reach it. The administrator needs to power-cycle it and watch the console during boot.',
      q: 'Which network and interface should be used?',
      opts: [
        'The OOB network, via the node\'s BMC (web UI KVM, Redfish or ipmitool)',
        'The in-band network, via SSH once the node responds to ping',
        'The compute fabric, via the subnet manager',
        'The storage network, via the NFS server'],
      a: 0,
      why: 'The BMC runs independently of the host OS on its own network port and power, so it is reachable over OOB while the host is hung. It provides power control and a remote console.',
      distract: 'SSH over in-band needs a running OS. The compute fabric and storage network carry data traffic and offer no power or console control.' },

    { id: 'b04', domain: 'bringup',
      q: 'An administrator must collect firmware inventory from 300 BMCs every night and feed it into an automation pipeline. Which interface is the best fit?',
      opts: [
        'ipmitool sel elist over lanplus',
        'The BMC web UI with a screen-scraping script',
        'SSH to each host and run dmidecode',
        'Redfish UpdateService/FirmwareInventory over HTTPS'],
      a: 3,
      why: 'Redfish is the REST/JSON standard designed for scriptable, at-scale BMC management. FirmwareInventory returns every component\'s version as structured data and works with the host powered off.',
      distract: '**sel elist** returns event logs, not firmware versions. **Screen-scraping** is brittle. **dmidecode** needs the host OS and only shows a subset (BIOS, not HGX tray or PSU firmware).' },

    { id: 'b05', domain: 'bringup',
      scenario: 'Security policy requires LUKS disk encryption on the OS drives with keys sealed to the platform. The OS image has not been installed yet.',
      q: 'What must be done first?',
      opts: [
        'Install the OS, then clear the TPM so it can take ownership of the new keys',
        'Disable Secure Boot so the installer can access the TPM',
        'Enable the TPM (TPM 2.0) in BIOS/UEFI before installing the OS',
        'Enable IPMI over LAN so the BMC can store the keys'],
      a: 2,
      why: 'TPM-sealed encryption is configured during OS installation, so the TPM has to be enabled in firmware beforehand. After installation you verify /dev/tpm0 and the TPM version from the OS.',
      distract: 'Clearing the TPM **after** install destroys any keys sealed to it. Secure Boot does not block TPM access. The BMC does not store disk encryption keys.' },

    { id: 'b06', domain: 'bringup',
      scenario: 'nvfwupd reports that a DGX firmware update completed successfully. After an OS reboot, show_version still lists the old HGX tray and CPLD versions.',
      q: 'What is the most likely reason?',
      opts: [
        'The new firmware is staged but not activated; the components need an AC power cycle',
        'The package was corrupted and the update silently failed',
        'show_version caches results for 24 hours',
        'The GPU driver must be reinstalled before firmware versions refresh'],
      a: 0,
      why: 'Standby-powered controllers such as the HGX tray, CPLDs and PSUs keep running across a warm reboot. Many of these images take effect only after a full AC power cycle, after which show_version should report the new versions.',
      distract: 'A corrupted package would fail signature checks and report an error. show_version queries the BMC live. The driver does not control firmware activation.' },

    { id: 'b07', domain: 'bringup',
      q: 'Why are HGX baseboard components (GPUs, NVSwitch, FPGA, retimers) updated as a single bundle rather than GPU by GPU?',
      opts: [
        'Individual GPU firmware can only be flashed from the host OS with nvidia-smi',
        'Bundling reduces the size of the download',
        'NVSwitch firmware is updated automatically by Fabric Manager',
        'The components are validated together, and mixed versions can break NVLink training and fabric initialisation'],
      a: 3,
      why: 'The HGX tray is qualified as one set of versions and managed by the HGX Management Controller through the BMC. Applying it as a bundle keeps GPUs, NVSwitch and supporting logic consistent.',
      distract: 'nvidia-smi is not the HGX firmware update path. Download size is irrelevant. Fabric Manager programs NVSwitch routing but does not flash firmware.' },

    { id: 'b08', domain: 'bringup',
      scenario: 'A rack has four DGX H100 systems. Each has six PSUs split evenly between PDU-A and PDU-B. Each PDU is rated for 30 kW usable.',
      q: 'What is the problem with this design?',
      opts: [
        'None; six PSUs per node already provide N+N redundancy',
        'If one feed fails, the surviving PDU must carry the whole rack (about 40 kW at maximum), exceeding its 30 kW rating',
        'DGX H100 PSUs must all be on one PDU to share load evenly',
        'Four DGX H100 systems need only about 20 kW, so the PDUs are oversized'],
      a: 1,
      why: 'Four DGX H100s draw up to about 10.2 kW each, roughly 41 kW. With A/B redundancy, each feed must be able to carry the full load alone. At 30 kW, losing one feed overloads the other and the whole rack goes down.',
      distract: 'PSU count alone does not make the rack redundant if the feed behind it cannot carry the load. Putting all PSUs on one PDU removes feed redundancy. The ~20 kW figure underestimates the maximum draw.' },

    { id: 'b09', domain: 'bringup',
      scenario: 'After the monthly burn-in, GPUs in the two top nodes of every rack show thermal slowdown in nvidia-smi, while the bottom nodes are fine. Inlet temperature at the bottom of the rack is within spec.',
      q: 'What should be investigated first?',
      opts: [
        'Hot-air recirculation — missing blanking panels or gaps in aisle containment near the top of the racks',
        'A firmware bug on the top nodes',
        'Insufficient PSU redundancy in the top nodes',
        'Incorrect NCCL environment variables'],
      a: 0,
      why: 'A problem that follows rack position points at the airflow environment. Hot exhaust recirculating over the top of or through gaps in the rack raises inlet temperature for the upper nodes. Blanking panels and containment fix it.',
      distract: 'Firmware would affect identical nodes regardless of position. PSU redundancy affects power, not thermal slowdown by rack height. NCCL settings do not cause thermal throttling.' },

    { id: 'b10', domain: 'bringup',
      q: 'Before installing a PCIe GPU into a certified server, which action is required?',
      opts: [
        'Leave AC power connected so the chassis stays grounded',
        'Install the GPU in any free x16 slot; placement does not affect performance',
        'Power off, remove AC power, and use a grounded ESD strap and mat',
        'Update the GPU VBIOS before inserting the card'],
      a: 2,
      why: 'Standard handling is ESD protection with the system fully de-energised. Standby power is present while AC is connected, and PCIe slots are not hot-pluggable.',
      distract: 'Leaving AC power connected risks damage because standby rails stay live. Slot placement does matter (NUMA/PCIe affinity with the NIC). VBIOS updates happen after installation through the proper tooling.' },

    { id: 'b11', domain: 'bringup',
      scenario: 'A newly installed PCIe GPU appears in nvidia-smi, but lspci -vvv shows LnkCap: Speed 32GT/s, Width x16 and LnkSta: Speed 32GT/s, Width x8.',
      q: 'What is the most likely cause?',
      opts: [
        'The GPU driver is too old for PCIe Gen5',
        'The card is poorly seated, in the wrong slot or riser, or the slot is bifurcated in BIOS',
        'Persistence mode is disabled',
        'ECC is enabled, which halves link width'],
      a: 1,
      why: 'Negotiated width below capability is a physical or platform issue: seating, the slot/riser wiring, or a BIOS bifurcation setting. Reseat the card and check the configuration guide for the correct slot.',
      distract: 'The driver does not set PCIe link width. Persistence mode and ECC do not affect PCIe training.' },

    { id: 'b12', domain: 'bringup',
      q: 'Two racks in the same row are about 20 m apart by cable route. Which medium is most appropriate for 400G NDR links between them?',
      opts: [
        'Passive DAC',
        'Active copper cable (ACC)',
        'Cat6a copper patch cable',
        'Multimode optical transceivers with MPO fibre (or an AOC)'],
      a: 3,
      why: 'At 400G, copper (DAC and ACC) reaches only a few metres. A 20 m run within a row is well within multimode SR optics or AOC reach.',
      distract: 'DAC and ACC are limited to in-rack or adjacent-rack distances at this speed. Cat6a is for 1/10 GbE management, not NDR.' },

    { id: 'b13', domain: 'bringup',
      scenario: 'An engineer connects an SR (850 nm) transceiver to a structured-cabling patch panel. The link does not come up. The patch lead has a yellow jacket and angled-polish MPO connectors.',
      q: 'What is wrong?',
      opts: [
        'The subnet manager has not assigned a LID',
        'The transceiver needs a firmware update before first use',
        'The fibre is too short for SR optics',
        'SR optics need multimode fibre; the yellow APC lead is single-mode fibre'],
      a: 3,
      why: 'Yellow jackets and APC MPO connectors indicate single-mode fibre, intended for DR/FR optics. SR transceivers need multimode (OM3/OM4). Mismatched fibre type prevents a reliable physical link.',
      distract: 'A missing subnet manager leaves the physical link up with the logical state in Initializing, which is not the same as no link. SR optics have no minimum length at typical patch distances, and firmware is not the issue here.' },

    { id: 'b14', domain: 'bringup',
      scenario: 'On an 8-GPU HGX node, nvidia-smi topo -m shows NV18 between all GPU pairs except GPU5, which shows SYS to every other GPU. nvidia-smi nvlink -s shows GPU5 links inactive.',
      q: 'What does this indicate?',
      opts: [
        'GPU5\'s NVLink/NVSwitch connectivity is not working; investigate that GPU and the baseboard (nvidia-smi, dcgmi diag, SEL, Xid 74)',
        'GPU5 is in MIG mode, which disables NVLink reporting',
        'The node is working as designed; one GPU is always reserved for PCIe traffic',
        'The InfiniBand subnet manager has not configured GPU5\'s NIC'],
      a: 0,
      why: 'On an NVSwitch system every GPU pair should report NV#. SYS means traffic between GPU5 and the others would fall back to crossing the CPU, and the inactive links confirm an NVLink fault on that GPU or its baseboard path.',
      distract: 'HGX does not reserve a GPU for PCIe. MIG does not make topo report SYS for every peer. NICs and the subnet manager have nothing to do with GPU-to-GPU NVLink.' },

    { id: 'b15', domain: 'bringup',
      scenario: 'A new NFS appliance is mounted on DGX nodes over the storage network. Directory listings and small files work, but copying a large dataset hangs. Hosts are set to MTU 9000.',
      q: 'Which check is most likely to find the problem?',
      opts: [
        'Run dcgmi diag -r 3 on the DGX nodes',
        'Increase nconnect from 8 to 32',
        'Test the path with ping -M do -s 8972 to confirm every hop supports jumbo frames',
        'Re-seat the OSFP modules on the compute fabric'],
      a: 2,
      why: 'Small transfers working while large ones hang is the classic sign of an MTU mismatch: a switch or the array is still at 1500. A do-not-fragment ping at 8972 bytes tests the full 9000-byte path.',
      distract: '**dcgmi** tests GPUs, not storage networking. Raising **nconnect** adds connections but will not fix dropped jumbo frames. The **compute fabric** does not carry this NFS traffic.' },

    { id: 'b16', domain: 'bringup',
      scenario: 'After an OS reprovision, nvidia-smi on an HGX node lists all 8 GPUs with no errors, but any CUDA application fails with "system not yet initialized".',
      q: 'What should the administrator check first?',
      opts: [
        'The BMC network configuration',
        'Whether nvidia-fabricmanager is running and matches the installed driver version',
        'Whether the TPM is enabled',
        'The NFS mount options'],
      a: 1,
      why: 'On NVSwitch-based systems, Fabric Manager must configure NVSwitch routing before CUDA can use the GPUs, and its version must exactly match the driver. The error is typical of a stopped or mismatched Fabric Manager.',
      distract: 'The BMC and TPM do not gate CUDA initialisation. Storage mounts are unrelated to GPU initialisation.' },
  ],
}

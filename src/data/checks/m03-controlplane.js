// End-of-lesson comprehension checks for Module 3: Control Plane Installation and Configuration. Keyed by lesson id.
export default {
  'bcm-ha': [
    {
      q: 'Which BCM network does the head node use to power compute nodes on and off and read their sensors?',
      opts: ['internalnet', 'ipminet', 'externalnet', 'ibnet'],
      a: 1,
      why: '**ipminet** (default 10.148.0.0/16) connects the head node to each node\'s BMC, so BCM uses it for IPMI/Redfish power control and sensor data.',
      distract: '**internalnet** carries provisioning and management traffic to the host OS, **externalnet** is the site uplink, and **ibnet** is the compute fabric.',
    },
    {
      q: 'You need to create a new node group that uses a different software image and runs slurmd. Which cmsh mode do you work in?',
      opts: ['device', 'softwareimage', 'network', 'category'],
      a: 3,
      why: 'A **category** groups nodes that share an image, roles (such as slurmclient), mounts and services. Clone an existing category, set its softwareimage and commit.',
      distract: '**device** is for individual nodes, **softwareimage** manages the images themselves, and **network** defines subnets.',
    },
    {
      q: 'While configuring BCM HA, which command clones the primary head node onto the secondary?',
      opts: ['/cm/cm-clone-install --failover, run on the secondary', 'cmha makeactive, run on the primary', 'cmha dbreclone, run on the primary', 'imageupdate -n head2'],
      a: 0,
      why: 'After `cmha-setup` prepares the failover configuration, you boot the secondary (via PXE or the ISO\'s rescue environment) and run `cm-clone-install --failover` to copy the primary onto it. Then you finalise in cmha-setup.',
      distract: '**makeactive** switches roles, **dbreclone** resynchronises the database on an existing pair, and **imageupdate** syncs compute nodes with their image.',
    },
    {
      q: 'An HA pair passes cmha status, but a real failure of the active head does not trigger failover. The logs show the passive head could not power off the failed node. What is the likely gap?',
      opts: [
        'The shared virtual IP is on the wrong subnet',
        'The cluster licence has expired',
        'BMC/IPMI access to the head nodes (fencing) is not working',
        'Base View is not installed on the secondary',
      ],
      a: 2,
      why: 'Before claiming the active role, the passive head must fence the old active node through its **BMC**. If ipminet access or the BMC credentials are wrong, the takeover stalls to avoid a split brain.',
      distract: 'A wrong **virtual IP** subnet or an **expired licence** would show up differently and would not cause a fencing failure. **Base View** is a GUI and plays no part in failover.',
    },
    {
      q: 'Why does a production BCM HA configuration put /cm/shared and /home on shared storage?',
      opts: [
        'Because the software images must live on NFS',
        'So both head nodes serve the same shared software and user data, and nothing changes for nodes after a failover',
        'Because cmsh cannot run without NFS',
        'To let compute nodes PXE-boot from the NAS instead of the head node',
      ],
      a: 1,
      why: 'Compute nodes mount /cm/shared and /home from the active head through the shared IP. With the data on shared storage, the new active head serves exactly the same content after a failover.',
      distract: 'Images stay under /cm/images on the head nodes, cmsh does not depend on NFS, and provisioning still comes from the head node.',
    },
  ],

  'os-cluster': [
    {
      q: 'In a BCM cluster, an admin installs a package by hand on dgx007 over SSH. A week later the package has gone. Why?',
      opts: [
        'DGX OS removes unsigned packages automatically',
        'Slurm reset the node when it was drained',
        'The package conflicted with Enroot',
        'The node was re-synced from its software image, which does not contain the package',
      ],
      a: 3,
      why: 'The **software image** is the source of truth. Provisioning or imageupdate syncs the node back to the image, so changes should be made inside the image chroot and then pushed out.',
      distract: 'DGX OS, Slurm and Enroot do not remove packages. The loss comes from BCM\'s image sync.',
    },
    {
      q: 'Which gres.conf line lets slurmd discover a node\'s GPUs automatically?',
      opts: ['AutoDetect=nvml', 'GresTypes=gpu', 'Gres=gpu:auto', 'SelectType=select/gpu'],
      a: 0,
      why: '`AutoDetect=nvml` in gres.conf makes slurmd enumerate GPUs through NVML, which the NVIDIA driver provides.',
      distract: '`GresTypes=gpu` belongs in slurm.conf and declares the resource type. `Gres=gpu:auto` and `select/gpu` are not valid settings.',
    },
    {
      q: 'An admin adds ib0 to dgx001 in cmsh. The interface exists, but ibstat reports State: Initializing. What is missing?',
      opts: [
        'A commit in cmsh',
        'A bond between ib0 and ib1',
        'A running InfiniBand subnet manager on the fabric',
        'The ipminet network definition',
      ],
      a: 2,
      why: 'Physical link up with the logical state stuck at **Initializing** means no subnet manager has brought the port to Active. Start OpenSM or UFM, or enable the SM on a managed switch.',
      distract: 'An uncommitted interface would not exist on the node. **Bonding** is not required for IB, and **ipminet** is for BMCs.',
    },
    {
      q: 'Which BCM tool deploys Slurm, including GPU GRES and optional Pyxis integration?',
      opts: ['cmha-setup', 'cm-wlm-setup', 'cm-kubernetes-setup', 'cm-chroot-sw-img'],
      a: 1,
      why: '**cm-wlm-setup** is the workload-manager wizard. It assigns slurmserver/slurmclient roles, generates slurm.conf and gres.conf, and can enable Pyxis.',
      distract: '**cmha-setup** configures head-node HA, **cm-kubernetes-setup** deploys Kubernetes (the base for Run:ai), and **cm-chroot-sw-img** opens a shell inside a software image.',
    },
    {
      q: 'A platform team wants quota-based, fair-share GPU scheduling with fractional GPUs for notebooks and inference, on a BCM-managed cluster. What fits best?',
      opts: [
        'Slurm with Pyxis and GRES',
        'Enroot on each node without a scheduler',
        'MIG alone, configured once at boot',
        'Kubernetes deployed by BCM, with NVIDIA Run:ai on top',
      ],
      a: 3,
      why: '**Run:ai** runs on Kubernetes and provides projects, quotas, fair share, over-quota borrowing and fractional GPUs. BCM can deploy the underlying Kubernetes cluster.',
      distract: 'Slurm is strong for batch training but is not the cloud-native quota/fractional-GPU platform described. Enroot is not a scheduler, and MIG only partitions GPUs; it does not schedule work onto them.',
    },
  ],

  drivers: [
    {
      q: 'Which package choice fits an HGX H100 server running Ubuntu?',
      opts: [
        'The proprietary desktop driver from the distribution\'s restricted repo',
        'The nouveau driver with firmware extracted',
        'A server-branch driver with open kernel modules (e.g. nvidia-driver-570-server-open) plus nvidia-fabricmanager-570',
        'Any driver, with Fabric Manager of the latest available version',
      ],
      a: 2,
      why: 'Data-center GPUs use the **-server** branch. **Open kernel modules** are recommended for Hopper and required on Grace Hopper and Blackwell, and Fabric Manager must match the driver version exactly.',
      distract: 'Desktop drivers and nouveau are wrong for HGX, and "latest" Fabric Manager is wrong unless it is exactly the driver\'s version.',
    },
    {
      q: 'After an apt upgrade, nvidia-smi prints "Failed to initialize NVML: Driver/library version mismatch". What does this mean?',
      opts: [
        'The new user-space libraries are installed but the old kernel module is still loaded; reload the modules or reboot',
        'A GPU has failed and must be replaced',
        'Fabric Manager has crashed',
        'nouveau has taken over the GPUs',
      ],
      a: 0,
      why: 'The error means the libraries and the loaded kernel module come from different versions. Stop GPU services, unload the nvidia modules and reload them, or simply reboot.',
      distract: 'This is not a hardware fault. **Fabric Manager** problems show up as CUDA initialisation errors, and **nouveau** would stop the nvidia module loading at all.',
    },
    {
      q: 'Which two steps are needed so nouveau does not claim the GPUs?',
      opts: [
        'Uninstall linux-firmware and reboot',
        'Set NVIDIA_VISIBLE_DEVICES=none and restart Docker',
        'Run nvidia-smi -pm 1 and reboot',
        'Create a modprobe.d file with "blacklist nouveau" and "options nouveau modeset=0", then rebuild the initramfs (update-initramfs -u or dracut -f)',
      ],
      a: 3,
      why: 'Blacklisting stops the module loading, and rebuilding the initramfs makes sure it is not loaded early in boot. Then reboot and check `lsmod | grep nouveau`.',
      distract: 'Removing **firmware**, **container environment variables** and **persistence mode** do not affect which kernel driver binds to the GPUs.',
    },
    {
      q: 'After installing DOCA-Host with the doca-ofed profile, which commands load the new stack and confirm the version?',
      opts: [
        'systemctl restart docker; nvidia-smi',
        '/etc/init.d/openibd restart; ofed_info -s (and ibstat to confirm ports are Active)',
        'modprobe nouveau; lspci',
        'cmha status; ibv_devinfo',
      ],
      a: 1,
      why: '`openibd restart` reloads the mlx5/IB driver stack, `ofed_info -s` prints the installed version, and `ibstat` shows the HCAs with their state and rate.',
      distract: 'Docker, nouveau and cmha have nothing to do with the host network driver stack.',
    },
    {
      q: 'In a BCM cluster, where should a new GPU driver be installed?',
      opts: [
        'Into a (preferably cloned) software image via its chroot, then rolled out to nodes by reboot or imageupdate',
        'On the head node only; compute nodes load it over NFS',
        'On each compute node over SSH',
        'Inside every user\'s container image',
      ],
      a: 0,
      why: 'Nodes receive everything from their **software image**. Install the driver (and matching Fabric Manager) into a cloned image built for the image\'s kernel, test on one node, then switch the category.',
      distract: 'Kernel modules are not loaded over NFS from the head node, per-node changes are overwritten at the next sync, and containers never contain the kernel driver.',
    },
  ],

  'containers-ngc': [
    {
      q: 'After installing nvidia-container-toolkit, which command registers the NVIDIA runtime with Docker?',
      opts: [
        'nvidia-smi --docker enable',
        'ngc config set --runtime docker',
        'nvidia-ctk runtime configure --runtime=docker (followed by restarting Docker)',
        'dockerd --add-runtime gpu',
      ],
      a: 2,
      why: '`nvidia-ctk runtime configure --runtime=docker` writes the nvidia runtime into /etc/docker/daemon.json. Docker must then be restarted to load it.',
      distract: 'The other commands are not valid ways to configure the runtime. **ngc config set** configures the NGC CLI.',
    },
    {
      q: 'Which Docker command runs a container with only GPUs 0 and 1?',
      opts: [
        'docker run --gpus 0,1 …',
        'docker run --device /dev/nvidia0-1 …',
        'docker run -e CUDA_DEVICES=0,1 …',
        'docker run --gpus \'"device=0,1"\' …',
      ],
      a: 3,
      why: 'Specific devices are selected with `device=`, and because the list contains a comma it needs the inner double quotes inside single quotes. With the nvidia runtime, `NVIDIA_VISIBLE_DEVICES=0,1` does the same.',
      distract: '`--gpus 0,1` is not valid (a bare number means a count), raw `--device` paths miss the driver libraries, and `CUDA_DEVICES` is not a recognised variable.',
    },
    {
      q: 'What do you enter as the username when running docker login nvcr.io?',
      opts: ['Your NGC account e-mail', 'The literal string $oauthtoken', 'Your NGC org name', 'nvidia'],
      a: 1,
      why: 'nvcr.io takes the literal username `$oauthtoken`, with the NGC API key as the password.',
      distract: 'E-mail, org name and "nvidia" are all rejected. The org is set in the NGC CLI configuration, not used as the registry username.',
    },
    {
      q: 'Which command sets the API key, output format, org and team for the NGC CLI?',
      opts: ['ngc config set', 'ngc login nvcr.io', 'ngc registry init', 'docker login nvcr.io'],
      a: 0,
      why: '`ngc config set` prompts for the API key, output format, org, team and ACE and stores them in ~/.ngc/config. `ngc config current` shows the result.',
      distract: '**ngc login** and **registry init** are not real subcommands, and **docker login** stores credentials for the container engine only.',
    },
    {
      q: 'A Podman host should use GPUs through CDI. What must be done after installing the driver and toolkit?',
      opts: [
        'Run nvidia-ctk runtime configure --runtime=docker',
        'Install Docker alongside Podman',
        'Generate the spec with nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml, then use --device nvidia.com/gpu=all',
        'Set NVIDIA_DRIVER_CAPABILITIES=all globally',
      ],
      a: 2,
      why: 'CDI runtimes read device specs from /etc/cdi. `nvidia-ctk cdi generate` creates the NVIDIA spec, and containers then ask for `nvidia.com/gpu=<n|all>`. Regenerate the spec after driver or MIG changes.',
      distract: 'The **docker runtime configuration** does not apply to Podman\'s CDI path, Docker is not required, and driver capabilities do not create device definitions.',
    },
  ],
}

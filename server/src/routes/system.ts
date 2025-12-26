import { Router } from 'express';
import si from 'systeminformation';
import { listContainers } from '../services/docker';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Get system stats
router.get('/stats', async (req, res) => {
  try {
    const [cpu, mem, disk, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.time()
    ]);

    res.json({
      cpu: {
        usage: Math.round(cpu.currentLoad),
        cores: cpu.cpus.length
      },
      memory: {
        total: mem.total,
        used: mem.active,
        free: mem.available,
        usagePercent: Math.round((mem.active / mem.total) * 100)
      },
      disk: disk.map(d => ({
        mount: d.mount,
        size: d.size,
        used: d.used,
        usagePercent: Math.round(d.use)
      })),
      uptime: time.uptime
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all containers
router.get('/containers', async (req, res) => {
  try {
    const containers = await listContainers();
    res.json(containers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get running processes
router.get('/processes', async (req, res) => {
  try {
    const processes = await si.processes();
    res.json(processes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Kill a process
router.post('/processes/:pid/kill', async (req, res) => {
  const pid = parseInt(req.params.pid);
  if (isNaN(pid)) {
    return res.status(400).json({ error: 'Invalid PID' });
  }

  try {
    // In a real scenario, you might want to check permissions or ownership here
    // For this admin panel, we assume the user has rights (sudo/root context of container)
    process.kill(pid, 'SIGTERM'); 
    res.json({ success: true });
  } catch (err: any) {
    // If SIGTERM fails, maybe try SIGKILL? Or return error.
    try {
        process.kill(pid, 'SIGKILL');
        res.json({ success: true, method: 'SIGKILL' });
    } catch (killErr: any) {
        res.status(500).json({ error: killErr.message });
    }
  }
});

export default router;

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import si from "systeminformation";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [
      cpu,
      mem,
      osInfo,
      time,
      currentLoad,
      fsSize,
      networkStats
    ] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.time(),
      si.currentLoad(),
      si.fsSize(),
      si.networkStats()
    ]);

    // Find the main drive (usually mounted on / or C:)
    const mainDrive = fsSize.find(fs => fs.mount === "/" || fs.mount === "C:") || fsSize[0];

    // Calculate network usage safely
    let rx_bytes = 0;
    let tx_bytes = 0;
    if (networkStats && networkStats.length > 0) {
      rx_bytes = networkStats.reduce((acc, curr) => acc + (curr.rx_bytes || 0), 0);
      tx_bytes = networkStats.reduce((acc, curr) => acc + (curr.tx_bytes || 0), 0);
    }

    const stats = {
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        uptime: time.uptime,
        hostname: osInfo.hostname,
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        speed: cpu.speed,
        load: currentLoad.currentLoad,
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        active: mem.active,
      },
      disk: {
        fs: mainDrive?.fs || "Unknown",
        type: mainDrive?.type || "Unknown",
        total: mainDrive?.size || 0,
        used: mainDrive?.used || 0,
        use: mainDrive?.use || 0,
      },
      network: {
        rx_bytes,
        tx_bytes,
      }
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Failed to get system stats:", error);
    return NextResponse.json({ error: "Failed to get system stats" }, { status: 500 });
  }
}

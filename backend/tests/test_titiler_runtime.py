import importlib.metadata
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import rasterio
from fastapi.testclient import TestClient
from rasterio.transform import from_origin

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from titiler_server import app


class TiTilerRuntimeTests(unittest.TestCase):
    def test_installed_dependencies_match_the_lock(self):
        requirements = Path(__file__).resolve().parents[1] / "requirements-titiler.txt"
        for line in requirements.read_text().splitlines():
            if not line or line.startswith("#"):
                continue
            name, version = line.split("==")
            with self.subTest(package=name):
                self.assertEqual(importlib.metadata.version(name), version)

    def test_health_bounds_and_nonblank_png_tiles(self):
        with tempfile.TemporaryDirectory(prefix="geoport-titiler-") as directory:
            source = Path(directory) / "test_cog.tif"
            pixels = np.full((3, 256, 256), 100, dtype="uint8")
            pixels[1] = 180
            with rasterio.open(source, "w", driver="COG", width=256, height=256,
                               count=3, dtype="uint8", crs="EPSG:4326",
                               transform=from_origin(121, 25, 0.004, 0.004)) as dataset:
                dataset.write(pixels)
            with TestClient(app) as client:
                health = client.get("/healthz")
                self.assertEqual(health.status_code, 200)
                self.assertEqual(health.json()["versions"]["titiler"], "0.24.2")
                bounds = client.get("/cog/bounds", params={"url": str(source)})
                self.assertEqual(bounds.status_code, 200)
                self.assertAlmostEqual(bounds.json()["bounds"][0], 121)
                tile = client.get("/cog/tiles/WebMercatorQuad/8/214/109.png",
                                  params={"url": str(source)})
                self.assertEqual(tile.status_code, 200)
                self.assertTrue(tile.content.startswith(b"\x89PNG\r\n\x1a\n"))
                with rasterio.MemoryFile(tile.content) as image:
                    with image.open() as dataset:
                        self.assertEqual((dataset.width, dataset.height), (256, 256))
                        self.assertTrue(np.any(dataset.read()[:3] > 0))


if __name__ == "__main__":
    unittest.main()

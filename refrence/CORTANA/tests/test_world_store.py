import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.schemas import WorldDocument
from backend import world_store


class WorldStoreTests(unittest.TestCase):
    def test_default_document_matches_schema(self):
        document = WorldDocument(**world_store.DEFAULT_WORLD)
        self.assertEqual(document.version, 1)
        self.assertEqual(document.objects, [])
        self.assertEqual(document.environment.background, "#ffffff")

    def test_atomic_round_trip(self):
        document = {
            "version": 1,
            "environment": {
                "background": "#ffffff",
                "ground_color": "#ffffff",
                "tile_scale": 24,
            },
            "objects": [],
        }
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            world_path = directory / "world.json"
            with (
                patch.object(world_store, "DATA_DIR", directory),
                patch.object(world_store, "WORLD_CONFIG_PATH", world_path),
            ):
                world_store.save_world_document(document)
                self.assertEqual(world_store.load_world_document(), document)


if __name__ == "__main__":
    unittest.main()


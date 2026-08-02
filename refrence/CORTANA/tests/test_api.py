import unittest

from fastapi.testclient import TestClient

from backend.main import app


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_reports_runtime_assets(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertTrue(payload["frontend"])
        self.assertTrue(payload["character"])

    def test_world_contract(self):
        response = self.client.get("/api/world")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["version"], 1)
        self.assertIn("environment", payload)
        self.assertIn("objects", payload)

    def test_source_model_tree_is_not_public(self):
        response = self.client.get("/model/test/Idle.fbx")
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()


import unittest

from backend.lip_sync import build_lip_sync_timeline, word_to_visemes


class LipSyncTests(unittest.TestCase):
    def test_aiueo_uses_expected_cc3_channels(self):
        self.assertEqual(word_to_visemes("a"), [("V_Open", None)])
        self.assertEqual(word_to_visemes("i"), [("V_Wide", None)])
        self.assertEqual(word_to_visemes("u"), [("V_Tight_O", None)])
        self.assertEqual(word_to_visemes("e"), [("V_Wide", None)])
        self.assertEqual(word_to_visemes("o"), [("V_Tight_O", None)])

    def test_duplicate_visemes_are_collapsed(self):
        self.assertEqual(word_to_visemes("see"), [("V_Lip_Open", None), ("V_Wide", None)])

    def test_timeline_is_ordered_and_bounded(self):
        timeline = build_lip_sync_timeline(
            [{"offset": 0, "duration": 10_000_000, "text": "mouth"}]
        )
        self.assertEqual(timeline["source"], "edge-word-boundary")
        self.assertGreater(len(timeline["cues"]), 0)
        self.assertEqual(timeline["cues"][0]["start"], 0)
        self.assertAlmostEqual(timeline["cues"][-1]["end"], 1.0, places=3)
        self.assertTrue(
            all(
                timeline["cues"][index]["end"] <= timeline["cues"][index + 1]["start"]
                for index in range(len(timeline["cues"]) - 1)
            )
        )


if __name__ == "__main__":
    unittest.main()


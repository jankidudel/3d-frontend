"""Independent numerical cases for the experimental linear path reader."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('paths', Path(__file__).with_name('inspect-paths.py'))
paths = importlib.util.module_from_spec(spec)
spec.loader.exec_module(paths)
SETUP = 'G21\nG90\nM82\nG92 E0\nG1 X0 Y0 Z0.2\n'


class LinearPaths(unittest.TestCase):
    def test_crossing_segment_without_endpoint_inside(self):
        segment = paths.parse(SETUP + 'G1 X10 E1')[0]
        self.assertTrue(paths.intersects(segment, [4, -1, 6, 1]))
        self.assertFalse(paths.intersects(segment, [4, 1, 6, 2]))

    def test_travel_and_pure_prime_are_not_model_paths(self):
        self.assertEqual(paths.parse(SETUP + 'G1 X10\nG1 E1'), [])

    def test_absolute_extrusion_reset(self):
        segments = paths.parse(SETUP + 'G1 X2 E1\nG92 E0\nG1 X4 E0.5')
        self.assertEqual([s['extrusion'] for s in segments], [1, 0.5])

    def test_relative_extrusion_and_retraction_debt(self):
        segments = paths.parse(SETUP + 'M83\nG1 E-2\nG1 E1\nG1 X2 E1\nG1 X4 E0.3')
        self.assertEqual(len(segments), 1)
        self.assertAlmostEqual(segments[0]['extrusion'], 0.3)
        self.assertEqual(segments[0]['start'], [2, 0, 0.2])

    def test_retraction_paid_during_move_clips_non_depositing_prefix(self):
        segment = paths.parse(SETUP + 'M83\nG1 E-1\nG1 X10 E2')[0]
        self.assertEqual(segment['start'], [5, 0, 0.2])
        self.assertEqual(segment['end'], [10, 0, 0.2])
        self.assertFalse(paths.intersects(segment, [1, -1, 4, 1]))
        self.assertTrue(paths.intersects(segment, [6, -1, 8, 1]))

    def test_relative_coordinates_and_continuous_z(self):
        segment = paths.parse(SETUP + 'G91\nG1 X2 Y3 Z0.05 E1')[0]
        self.assertEqual(segment['end'], [2, 3, 0.25])

    def test_feature_and_layer_scope(self):
        segment = paths.parse(SETUP + ';Z:0.2\n;TYPE:Top solid infill\nG1 X2 E1')[0]
        self.assertEqual(segment['feature'], 'Top solid infill')
        self.assertEqual(segment['layer'], 0.2)

    def test_unknown_motion_state_does_not_become_complete_output(self):
        for code in ['G2 X2 Y2 E1 I1', 'G20', 'G54', 'G1 Xnan E1', 'G1 X1e309 E1', 'G1 A1 E1']:
            with self.subTest(code=code), self.assertRaises(ValueError):
                paths.parse(SETUP + code)

    def test_homing_invalidates_coordinate_basis(self):
        with self.assertRaises(ValueError):
            paths.parse(SETUP + 'G28\nG1 X2 E1')


if __name__ == '__main__':
    unittest.main()

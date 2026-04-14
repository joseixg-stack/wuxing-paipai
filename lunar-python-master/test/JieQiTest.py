# -*- coding: utf-8 -*-
import unittest
from lunar_python import Lunar, Solar


class JieQiTest(unittest.TestCase):
    def test7(self):
        lunar = Lunar.fromYmd(2012, 9, 1)
        self.assertEqual("2012-09-07 13:29:01", lunar.getJieQiTable()["白露"].toYmdHms())

    def test8(self):
        lunar = Lunar.fromYmd(2050, 12, 1)
        self.assertEqual("2050-12-07 06:41:54", lunar.getJieQiTable()["DA_XUE"].toYmdHms())

    def test1(self):
        solar = Solar.fromYmd(2021, 12, 21)
        lunar = solar.getLunar()
        self.assertEqual("冬至", lunar.getJieQi())
        self.assertEqual("", lunar.getJie())
        self.assertEqual("冬至", lunar.getQi())

    def test2(self):
        lunar = Lunar.fromYmd(2023, 6, 1)
        self.assertEqual("2022-12-22 05:48:12", lunar.getJieQiTable()["冬至"].toYmdHms())

    def test3(self):
        lunar = Lunar.fromYmd(2025, 6, 1)
        self.assertEqual("2025-06-05 17:56:32", lunar.getJieQiTable()["芒种"].toYmdHms())

    def test_setName_reset_jie_to_qi(self):
        """Test that setName properly resets state when changing from 节 to 气"""
        from lunar_python import JieQi
        solar = Solar.fromYmd(2021, 12, 21)
        # 小寒 is a 节 (odd index in JIE_QI)
        jq = JieQi("小寒", solar)
        self.assertTrue(jq.isJie())
        self.assertFalse(jq.isQi())
        # Change to 冬至 which is a 气 (even index in JIE_QI)
        jq.setName("冬至")
        self.assertFalse(jq.isJie())
        self.assertTrue(jq.isQi())

    def test_setName_reset_qi_to_jie(self):
        """Test that setName properly resets state when changing from 气 to 节"""
        from lunar_python import JieQi
        solar = Solar.fromYmd(2021, 12, 21)
        # 冬至 is a 气 (even index in JIE_QI)
        jq = JieQi("冬至", solar)
        self.assertFalse(jq.isJie())
        self.assertTrue(jq.isQi())
        # Change to 小寒 which is a 节 (odd index in JIE_QI)
        jq.setName("小寒")
        self.assertTrue(jq.isJie())
        self.assertFalse(jq.isQi())

    def test_setName_unknown(self):
        """Test that unknown name leaves both jie and qi as False"""
        from lunar_python import JieQi
        solar = Solar.fromYmd(2021, 12, 21)
        jq = JieQi("冬至", solar)
        self.assertTrue(jq.isQi())
        # Set to unknown name
        jq.setName("未知节气")
        self.assertFalse(jq.isJie())
        self.assertFalse(jq.isQi())
        self.assertEqual("未知节气", jq.getName())

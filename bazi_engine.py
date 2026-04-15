from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any
import re
import sys


VENDOR_ROOT = Path(__file__).resolve().parent / "lunar-python-master"
if str(VENDOR_ROOT) not in sys.path:
    sys.path.insert(0, str(VENDOR_ROOT))

from lunar_python import Solar  # type: ignore  # noqa: E402
from lunar_python.util import LunarUtil  # type: ignore  # noqa: E402


STEM_ELEMENTS = {
    "甲": "木",
    "乙": "木",
    "丙": "火",
    "丁": "火",
    "戊": "土",
    "己": "土",
    "庚": "金",
    "辛": "金",
    "壬": "水",
    "癸": "水",
}

BRANCH_ELEMENTS = {
    "子": "水",
    "丑": "土",
    "寅": "木",
    "卯": "木",
    "辰": "土",
    "巳": "火",
    "午": "火",
    "未": "土",
    "申": "金",
    "酉": "金",
    "戌": "土",
    "亥": "水",
}

VALID_GAN = set(STEM_ELEMENTS.keys())
VALID_ZHI = set(BRANCH_ELEMENTS.keys())

TIME_RANGE_TO_CLOCK = {
    "late-zi": (23, 30, "根据时段近似为 23:30 计算时柱"),
    "chou": (2, 0, "根据时段近似为 02:00 计算时柱"),
    "yin": (4, 0, "根据时段近似为 04:00 计算时柱"),
    "mao": (6, 0, "根据时段近似为 06:00 计算时柱"),
    "chen": (8, 0, "根据时段近似为 08:00 计算时柱"),
    "si": (10, 0, "根据时段近似为 10:00 计算时柱"),
    "wu": (12, 0, "根据时段近似为 12:00 计算时柱"),
    "wei": (14, 0, "根据时段近似为 14:00 计算时柱"),
    "shen": (16, 0, "根据时段近似为 16:00 计算时柱"),
    "you": (18, 0, "根据时段近似为 18:00 计算时柱"),
    "early-night": (20, 0, "根据时段近似为 20:00 计算时柱"),
    "late-night": (22, 0, "根据时段近似为 22:00 计算时柱"),
    "unknown": (12, 0, "未提供出生时间，时柱暂不参与精确判断"),
    "exact": (12, 0, ""),
}

TIME_RANGE_BRANCHES = {
    "late-zi": ["子"],
    "chou": ["丑"],
    "yin": ["寅"],
    "mao": ["卯"],
    "chen": ["辰"],
    "si": ["巳"],
    "wu": ["午"],
    "wei": ["未"],
    "shen": ["申"],
    "you": ["酉"],
    "early-night": ["戌"],
    "late-night": ["亥"],
    "unknown": [],
    "exact": [],
}

TEN_GOD_PRIORITY = [
    "正官",
    "七杀",
    "正财",
    "偏财",
    "食神",
    "伤官",
    "正印",
    "偏印",
    "比肩",
    "劫财",
]

TEN_GOD_DETAILS = {
    "比肩": {"keyword": "自我、同辈、并肩", "relation": "兄弟、朋友、同辈、竞争者", "rule": "参考《渊海子平》十神体系，同我者为比肩。"},
    "劫财": {"keyword": "边界、争夺、关系试炼", "relation": "姐妹、竞争对手、损财者", "rule": "参考《渊海子平》十神体系，同我异阴阳为劫财。"},
    "食神": {"keyword": "表达、舒展、才华", "relation": "子女、口福、创造输出", "rule": "参考《五行、十神表》，我生且同阴阳者为食神。"},
    "伤官": {"keyword": "表达锋芒、破局、创造力", "relation": "子女、才艺、叛逆", "rule": "参考《三命通会》，伤官主才华横溢，也忌与官星失衡。"},
    "偏财": {"keyword": "资源调动、机会、人情流动", "relation": "偏财、父（男命）、情人", "rule": "参考《五行、十神表》，我克且同阴阳者为偏财。"},
    "正财": {"keyword": "稳定、现实、落地经营", "relation": "正财、妻（男命）、稳定收入", "rule": "参考《三命通会》，财星透出主现实经营与资源掌控。"},
    "七杀": {"keyword": "压力、执行、突破", "relation": "偏权、压力、小人、竞争", "rule": "参考《三命通会》，七杀格喜食神制杀或印化杀。"},
    "正官": {"keyword": "秩序、责任、规则感", "relation": "上级、名誉、夫（女命）", "rule": "参考《三命通会》，官星透出主端正、责任与秩序。"},
    "偏印": {"keyword": "洞察、独处、非典型学习", "relation": "偏学术、继母、孤独", "rule": "参考《三命通会》，偏印忌见食神，谓枭神夺食。"},
    "正印": {"keyword": "托举、学习、庇护", "relation": "母亲、学业、贵人", "rule": "参考《渊海子平》，生我异阴阳者为正印。"},
}

GEJU_RULES = {
    "正官": {"label": "正官格", "rule": "月支藏正官透出天干。主端正、有贵气，忌伤官破格。", "source": "《三命通会》"},
    "七杀": {"label": "七杀格", "rule": "月支藏七杀透出。主刚烈果断，须食神制杀或印化杀。", "source": "《三命通会》"},
    "正财": {"label": "正财格", "rule": "月支藏财星透出。主勤劳致富，忌比劫争财。", "source": "《三命通会》"},
    "偏财": {"label": "偏财格", "rule": "月支藏财星透出。主现实资源与外部机会，忌比劫夺财。", "source": "《三命通会》"},
    "正印": {"label": "正印格", "rule": "月支藏印星透出。主聪慧、学业、贵人助力。", "source": "《三命通会》"},
    "偏印": {"label": "偏印格", "rule": "月支藏偏印透出。主洞察、研究、非典型学习力。", "source": "《三命通会》"},
    "食神": {"label": "食神格", "rule": "月支藏食神透出。主食禄丰厚，重表达与舒展。", "source": "《三命通会》"},
    "伤官": {"label": "伤官格", "rule": "月支藏伤官透出。主才华外放，需注意伤官见官。", "source": "《三命通会》"},
}

AURA_THEMES = {
    "木": {
        "themeName": "Forest Bloom",
        "accent": "#92c98d",
        "accentSoft": "#d9f2c4",
        "glow": "#b4e7b0",
        "ink": "#163126",
        "aura": ["#d7f5be", "#ffe1d6", "#d2fff0", "#f9d8ff", "#fff1c2"],
    },
    "火": {
        "themeName": "Sunrise Ember",
        "accent": "#ff8c78",
        "accentSoft": "#ffd6c2",
        "glow": "#ffb3a1",
        "ink": "#35171a",
        "aura": ["#ffd7bf", "#ffc2d1", "#ffd3f6", "#ffe9b8", "#ffd8ca"],
    },
    "土": {
        "themeName": "Golden Clay",
        "accent": "#c59b64",
        "accentSoft": "#f1dfbe",
        "glow": "#e5cb9e",
        "ink": "#33261b",
        "aura": ["#f5e1bc", "#ffe7d2", "#e8e0ff", "#d9f1cf", "#ffecc6"],
    },
    "金": {
        "themeName": "Pearl Halo",
        "accent": "#a5a6da",
        "accentSoft": "#ece8ff",
        "glow": "#d6d5ff",
        "ink": "#1f2038",
        "aura": ["#f2ebff", "#e0efff", "#ffe1f4", "#dff6f2", "#fff3d1"],
    },
    "水": {
        "themeName": "Moonlit Tide",
        "accent": "#7eb6e8",
        "accentSoft": "#d9edff",
        "glow": "#abd7ff",
        "ink": "#15283a",
        "aura": ["#d9ecff", "#dff9ff", "#eadcff", "#ffe2f1", "#fff0cf"],
    },
}


@dataclass
class BirthTimeChoice:
    hour: int
    minute: int
    second: int
    exact: bool
    note: str


def _parse_birthday_text(value: str) -> tuple[int, int, int]:
    text = (value or "").strip()
    if not text:
        raise ValueError("请先填写阳历生日，例如：2001-01-29")

    digits_only = re.sub(r"\D", "", text)
    if len(digits_only) == 8:
        return int(digits_only[:4]), int(digits_only[4:6]), int(digits_only[6:8])

    normalized = (
        text.replace("年", "-")
        .replace("月", "-")
        .replace("日", "")
        .replace("/", "-")
        .replace(".", "-")
        .replace(" ", "")
    )
    match = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", normalized)
    if not match:
        raise ValueError("阳历生日格式不正确，请输入如：2001-01-29")

    year_text, month_text, day_text = match.groups()
    return int(year_text), int(month_text), int(day_text)


def _resolve_birth_time(payload: dict[str, Any]) -> BirthTimeChoice:
    birth_time = (payload.get("birthTime") or "").strip()
    if birth_time:
        hour_text, minute_text = birth_time.split(":")
        return BirthTimeChoice(int(hour_text), int(minute_text), 0, True, "")

    time_range = payload.get("timeRange") or "unknown"
    hour, minute, note = TIME_RANGE_TO_CLOCK.get(time_range, TIME_RANGE_TO_CLOCK["unknown"])
    exact = time_range not in {"unknown"}
    return BirthTimeChoice(hour, minute, 0, exact, note)


def _get_hour_stem_start(day_stem: str) -> str:
    table = {
        ("甲", "己"): "甲",
        ("乙", "庚"): "丙",
        ("丙", "辛"): "戊",
        ("丁", "壬"): "庚",
        ("戊", "癸"): "壬",
    }
    for stems, start in table.items():
        if day_stem in stems:
            return start
    return "甲"


def _get_hour_ganzhi(day_stem: str, branch: str) -> str:
    start = _get_hour_stem_start(day_stem)
    gan_list = list(STEM_ELEMENTS.keys())
    zhi_list = list(BRANCH_ELEMENTS.keys())
    start_index = gan_list.index(start)
    branch_index = zhi_list.index(branch)
    return gan_list[(start_index + branch_index) % 10] + branch


def _build_time_insight(payload: dict[str, Any], day_stem: str, exact_time_pillar: str, exact_branch: str) -> dict[str, Any]:
    if payload.get("birthTime"):
        return {
            "mode": "exact",
            "label": "已提供精确时间",
            "summary": f"当前按精确出生时间排出时柱：{exact_time_pillar}。",
            "candidates": [
                {
                    "branch": exact_branch,
                    "pillar": exact_time_pillar,
                    "note": "这是当前唯一采用的时柱。",
                }
            ],
            "prompt": "当前时柱已较明确，可以直接看完整命盘。",
        }

    time_range = payload.get("timeRange") or "unknown"
    branches = TIME_RANGE_BRANCHES.get(time_range, [])
    if not branches:
        return {
            "mode": "unknown",
            "label": "时辰未知",
            "summary": "你还不知道准确出生时间，当前更适合先看年、月、日三柱的大方向。",
            "candidates": [],
            "prompt": "如果以后能补到大概的白天/晚上或更细的时间段，时柱、子女宫、晚运和部分流年判断会明显更清晰。",
        }

    candidates = [
        {
            "branch": branch,
            "pillar": _get_hour_ganzhi(day_stem, branch),
            "note": "这是该时段可能落入的时柱之一。",
        }
        for branch in branches
    ]

    if len(candidates) == 1:
        return {
            "mode": "fuzzy-single",
            "label": "时段已足够判断时柱",
            "summary": f"虽然没有精确到分钟，但这个时段基本可以落到 {candidates[0]['pillar']}。",
            "candidates": candidates,
            "prompt": "现在已经能看主要结构，如果之后拿到更准的分钟数，还可以继续校准起运细节。",
        }

    return {
        "mode": "fuzzy-multi",
        "label": "存在多个可能时柱",
        "summary": f"这个时间段可能对应 {len(candidates)} 种时柱，建议先看共性，再根据人生经历做时辰校准。",
        "candidates": candidates,
        "prompt": "可以先看年、月、日三柱和大运共性；如果你愿意补充更细的出生时段，感情、晚运和子女相关判断会更贴近本人。",
    }


def _pillar_payload(
    label: str,
    ganzhi: str,
    gan: str,
    zhi: str,
    shishen_gan: str,
    shishen_zhi: list[str],
    hide_gan: list[str],
    wuxing: str,
    nayin: str,
    di_shi: str,
    include: bool = True,
) -> dict[str, Any]:
    if not include:
        return {
            "label": label,
            "ganzhi": "未知",
            "gan": "",
            "zhi": "",
            "shishenGan": "",
            "shishenZhi": [],
            "hideGan": [],
            "wuxing": "",
            "nayin": "",
            "diShi": "",
        }

    return {
        "label": label,
        "ganzhi": ganzhi,
        "gan": gan,
        "zhi": zhi,
        "shishenGan": shishen_gan,
        "shishenZhi": shishen_zhi,
        "hideGan": hide_gan,
        "wuxing": wuxing,
        "nayin": nayin,
        "diShi": di_shi,
    }


def _compute_element_scores(pillars: list[dict[str, Any]]) -> dict[str, int]:
    scores = {"木": 0, "火": 0, "土": 0, "金": 0, "水": 0}
    for pillar in pillars:
        gan = pillar["gan"]
        zhi = pillar["zhi"]
        if gan:
            scores[STEM_ELEMENTS[gan]] += 2
        if zhi:
            scores[BRANCH_ELEMENTS[zhi]] += 1
        for hidden in pillar["hideGan"]:
            scores[STEM_ELEMENTS[hidden]] += 1
    return scores


def _favorable_elements(day_element: str, pattern: str) -> list[str]:
    table = {
        "木": ["金", "土"] if pattern == "日主偏旺" else ["水", "木"],
        "火": ["水", "金"] if pattern == "日主偏旺" else ["木", "火"],
        "土": ["木", "水"] if pattern == "日主偏旺" else ["火", "土"],
        "金": ["火", "木"] if pattern == "日主偏旺" else ["土", "金"],
        "水": ["土", "火"] if pattern == "日主偏旺" else ["金", "水"],
    }
    return table[day_element]


def _count_ten_gods(pillars: list[dict[str, Any]]) -> dict[str, int]:
    counts = {name: 0 for name in TEN_GOD_PRIORITY}
    for pillar in pillars:
        shishen_gan = pillar["shishenGan"]
        if shishen_gan in counts:
            counts[shishen_gan] += 2
        for item in pillar["shishenZhi"]:
            if item in counts:
                counts[item] += 1
    return counts


def _dominant_ten_gods(counts: dict[str, int]) -> list[dict[str, Any]]:
    sorted_items = sorted(counts.items(), key=lambda item: (-item[1], TEN_GOD_PRIORITY.index(item[0])))
    result = []
    for name, score in sorted_items:
        if score <= 0:
            continue
        detail = TEN_GOD_DETAILS.get(name, {})
        result.append(
            {
                "name": name,
                "score": score,
                "keyword": detail.get("keyword", ""),
                "relation": detail.get("relation", ""),
                "rule": detail.get("rule", ""),
            }
        )
        if len(result) >= 4:
            break
    return result


def _infer_geju(pillars: list[dict[str, Any]]) -> dict[str, str]:
    month_pillar = pillars[1]
    month_gan = month_pillar["shishenGan"]
    month_zhi_main = month_pillar["shishenZhi"][0] if month_pillar["shishenZhi"] else ""
    geju_name = None
    basis = ""

    if month_gan in GEJU_RULES and month_gan == month_zhi_main:
        geju_name = month_gan
        basis = f"月令主气为{month_zhi_main}，且月干同样透出{month_gan}，符合月支藏神透干取格。"
    elif month_gan in GEJU_RULES:
        geju_name = month_gan
        basis = f"月干透出{month_gan}，以月令为先，按透干优先视作格局主轴。"
    elif month_zhi_main in GEJU_RULES:
        geju_name = month_zhi_main
        basis = f"月令主气落在{month_zhi_main}，虽未完全透干，仍以月令主气作为格局倾向参考。"

    if geju_name is None:
        geju_name = next((item["name"] for item in _dominant_ten_gods(_count_ten_gods(pillars)) if item["name"] in GEJU_RULES), None)
        if geju_name:
            basis = f"月令未形成标准透干格，退而参考命局中最突出的十神 {geju_name} 作为结构倾向。"

    if geju_name and geju_name in GEJU_RULES:
        rule = GEJU_RULES[geju_name]
        return {
            "label": rule["label"],
            "summary": rule["rule"],
            "basis": basis,
            "source": rule["source"],
        }

    return {
        "label": "比劫格倾向",
        "summary": "月令未形成标准正格透干，暂以比劫/自我驱动结构理解整盘发力方式。",
        "basis": "参考《渊海子平》与《子平真诠》，当月令不成标准正格时，需退一步看旺衰与主导十神。",
        "source": "《渊海子平》《子平真诠》",
    }


def _detect_branch_relations(target: str, others: list[str]) -> list[str]:
    if not target:
        return []
    six_chong = {"子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"}
    six_he = {"子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"}
    xing_pairs = {"寅巳", "巳申", "寅申", "丑戌", "戌未", "丑未", "子卯", "辰辰", "午午", "酉酉", "亥亥"}
    hai_pairs = {"子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"}

    relations = []
    for other in others:
        if not other:
            continue
        pair = "".join(sorted([target, other], key=lambda x: "子丑寅卯辰巳午未申酉戌亥".index(x)))
        if pair in six_chong:
            relations.append(f"与{other}成冲")
        if pair in six_he:
            relations.append(f"与{other}成合")
        if pair in hai_pairs:
            relations.append(f"与{other}成害")
        if target == other and pair in xing_pairs:
            relations.append(f"与{other}成自刑")
        elif pair in xing_pairs:
            relations.append(f"与{other}成刑")
    return relations


def _annual_keywords(ten_god: str) -> tuple[str, str]:
    mapping = {
        "比肩": ("重建边界", "更适合把注意力放回自己，整理关系和行动边界。"),
        "劫财": ("关系波动", "适合谨慎处理资源、人际与冲动决策，先稳后动更顺。"),
        "食神": ("舒展表达", "这是更容易输出、表达、修复情绪的年份。"),
        "伤官": ("打破旧壳", "有表达欲和突破感，适合转型，但也要注意锋芒过急。"),
        "偏财": ("机会流动", "偏向资源、人脉、外部机会，需要辨别机会质量。"),
        "正财": ("落地收获", "更适合谈现实、做长期安排、让计划真正落地。"),
        "七杀": ("压力成形", "挑战感会上升，但也容易逼出执行力和成熟度。"),
        "正官": ("秩序升级", "利规则、身份、工作、考试与责任的建立。"),
        "偏印": ("向内修复", "适合整理内在、学习新知识，也要避免过度封闭。"),
        "正印": ("被温柔托住", "更适合学习、进修、休养和被支持的节奏。"),
    }
    return mapping.get(ten_god, ("感受流动", "这一年更适合观察节奏变化，慢慢调整生活重心。"))


def _build_annual_cards(day_gan: str, natal_branches: list[str], current_year: int, horizon: int, current_dayun: dict[str, Any] | None) -> list[dict[str, Any]]:
    cards = []
    dayun_branch = current_dayun["ganzhi"][1] if current_dayun and current_dayun.get("ganzhi") and current_dayun["ganzhi"] != "小运" else ""
    for year in range(current_year, current_year + horizon):
        solar = Solar.fromYmdHms(year, 7, 1, 12, 0, 0)
        lunar = solar.getLunar()
        ganzhi = lunar.getYearInGanZhiExact()
        ten_god = LunarUtil.SHI_SHEN.get(day_gan + ganzhi[0], "流年")
        title, advice = _annual_keywords(ten_god)
        branch_relations = _detect_branch_relations(ganzhi[1], natal_branches + ([dayun_branch] if dayun_branch else []))
        branch_text = "、".join(branch_relations) if branch_relations else "与原局无明显冲合刑害"
        if current_dayun:
            rule_basis = f"参考《大运规则详解》“大运为环境，流年为引动”，当前流年以{ten_god}引动{current_dayun['ganzhi']}这步运。"
        else:
            rule_basis = "参考《大运规则详解》，起运前以原局为主看流年引动。"
        cards.append(
            {
                "year": year,
                "ganzhi": ganzhi,
                "tenGod": ten_god,
                "title": title,
                "summary": f"{advice} {branch_text}。",
                "luckContext": current_dayun["ganzhi"] if current_dayun else "",
                "relations": branch_relations,
                "ruleBasis": rule_basis,
            }
        )
    return cards


def _theme_payload(dominant_element: str, favorable: list[str]) -> dict[str, Any]:
    theme = AURA_THEMES[dominant_element]
    return {
        "dominantElement": dominant_element,
        "themeName": theme["themeName"],
        "accent": theme["accent"],
        "accentSoft": theme["accentSoft"],
        "glow": theme["glow"],
        "ink": theme["ink"],
        "aura": theme["aura"],
        "favorable": favorable,
    }


def _pillar_from_ganzhi(label: str, ganzhi: str, day_gan: str) -> dict[str, Any]:
    gan = ganzhi[0] if ganzhi and len(ganzhi) == 2 else ""
    zhi = ganzhi[1] if ganzhi and len(ganzhi) == 2 else ""
    hide_gan = list(LunarUtil.ZHI_HIDE_GAN.get(zhi, [])) if zhi else []
    shishen_gan = "日主" if label == "日柱" else (LunarUtil.SHI_SHEN.get(day_gan + gan, "") if gan else "")
    shishen_zhi = [LunarUtil.SHI_SHEN.get(day_gan + item, "") for item in hide_gan]
    return {
        "label": label,
        "ganzhi": ganzhi if ganzhi else "未知",
        "gan": gan,
        "zhi": zhi,
        "shishenGan": shishen_gan,
        "shishenZhi": shishen_zhi,
        "hideGan": hide_gan,
        "wuxing": f"{STEM_ELEMENTS.get(gan, '')}{BRANCH_ELEMENTS.get(zhi, '')}" if gan and zhi else "",
        "nayin": LunarUtil.NAYIN.get(ganzhi, "") if ganzhi else "",
        "diShi": "",
    }


def _normalize_pillar_text(value: str) -> str:
    return (value or "").strip().replace(" ", "").replace("　", "")


def _validate_pillar(value: str, label: str, required: bool = True) -> str:
    value = _normalize_pillar_text(value)
    if not value:
        if required:
            raise ValueError(f"{label}不能为空，格式如：庚辰")
        return ""
    if len(value) != 2:
        raise ValueError(f"{label}格式不正确，需输入两个汉字，例如：庚辰")
    if value[0] not in VALID_GAN or value[1] not in VALID_ZHI:
        raise ValueError(f"{label}不是有效的干支组合，请输入如：庚辰、己丑、壬辰")
    return value


def _build_analysis(
    name: str,
    focus: str,
    horizon: str,
    day_master: dict[str, str],
    dominant_element: str,
    favorable: list[str],
    geju: dict[str, str],
    dominant_ten_gods: list[dict[str, Any]],
    current_dayun: dict[str, Any] | None,
) -> dict[str, str]:
    ten_god_names = [item["name"] for item in dominant_ten_gods[:3]]
    head = ten_god_names[0] if ten_god_names else "平衡"
    pair = "、".join(ten_god_names[:2]) if ten_god_names else "平衡"
    geju_label = geju["label"]
    pattern = day_master["pattern"]
    dayun_text = current_dayun["ganzhi"] if current_dayun else "眼下这步运"
    favorable_text = "、".join(favorable) if favorable else "顺势的气"
    horizon_text = f"未来 {horizon} 年"
    stem_text = f"{day_master['stem']}{day_master['element']}"
    is_weak = "偏弱" in pattern
    is_strong = "偏旺" in pattern or "身旺" in pattern

    def has_any(*targets: str) -> bool:
        return any(target in ten_god_names for target in targets)

    def geju_voice() -> str:
        if geju_label == "正官格":
            return "这张盘先看格局，骨架就很清楚。重的不是表面气势，而是次序、标准和做事的分寸。"
        if geju_label in {"食神格", "伤官格"}:
            return "这张盘最显眼的，不是安静守着，而是脑子转得快、判断来得快，很多事心里都有自己的说法。"
        if geju_label in {"偏印格", "正印格"}:
            return "这张盘的气先是往里收的，很多事情不会急着表态，更习惯先想透，再决定往哪边站。"
        if geju_label in {"正财格", "偏财格"}:
            return "这张盘更在意现实落点，不太会只活在感觉里，做事往往会先掂量值不值、划不划算、能不能落下来。"
        return "这张盘不是只靠一处发声，而是几股力量慢慢合到一起，所以读的时候要看主轴落在哪。"

    def pair_voice() -> str:
        if has_any("偏印") and has_any("正官"):
            return "偏印和正官一起出来，说明心里有判断，也会看规则，但不会为了合群就轻易交出自己的尺度。"
        if has_any("正印") and has_any("正官"):
            return "正印和正官并见，说明很多决定会天然偏向靠谱、完整和能不能长期站住。"
        if has_any("伤官") and has_any("正官"):
            return "伤官和官星同时显眼，内在张力会比较强，一边想按自己的判断来，一边又不是真的想乱来。"
        if has_any("食神") and has_any("财"):
            return "食神和财星一起发力时，很多机会并不是突然掉下来，而是靠能力、效率和结果慢慢换来的。"
        if has_any("偏印") and has_any("七杀"):
            return "偏印和七杀并见，警觉心会更重，很多事会先看清风险，再决定要不要下场。"
        return f"眼下更显眼的是 {pair}，所以这张盘做判断时，不会只看表面顺不顺。"

    def overview_line() -> str:
        if geju_label == "正官格" and has_any("偏印") and has_any("正官"):
            return f"{geju_voice()}{stem_text}落在{geju_label}里，{pair_voice()} 所以很多决定不是一时冲动，而是先想明白，再决定要不要往前。"
        if geju_label == "正官格" and has_any("正印") and has_any("正官"):
            return f"{geju_voice()}{stem_text}落在{geju_label}里，{pair_voice()} 所以看起来也会比同龄人更稳一些。"
        if geju_label in {"食神格", "伤官格"}:
            return f"{geju_voice()}{stem_text}目前看是{pattern}，{pair_voice()} 所以很多时候不是没能力，而是不愿意把力气用在太笨的方式上。"
        if geju_label in {"偏印格", "正印格"}:
            return f"{geju_voice()}{stem_text}落在{geju_label}，{pair_voice()} 所以很多事不是看表面热不热，而是先看值不值得。"
        if geju_label in {"正财格", "偏财格"}:
            return f"{geju_voice()}{stem_text}落在{geju_label}，{pair_voice()} 所以这张盘对现实感会特别敏锐，不太喜欢空转。"
        return f"{geju_voice()}{stem_text}目前看是{pattern}，格局落在{geju_label}，{pair_voice()} 所以走法往往不是猛冲，而是先定准重心，再发力。"

    def career_line() -> str:
        if geju_label == "正官格" and has_any("偏印"):
            return f"事业这块更适合走有标准、有门槛、能慢慢抬位置的路。{dayun_text}把责任、位置和现实安排推到眼前，而偏印这层气又让这张盘很会先看清规则，再选怎么发力。"
        if geju_label == "正官格" and has_any("正印"):
            return f"事业上很适合往专业体系、稳定平台或需要长期信任感的位置走。{dayun_text}把现实安排推到眼前，而正印、正官这一组也让这张盘更容易在系统里慢慢站稳。"
        if geju_label in {"食神格", "伤官格"}:
            return f"事业上不太适合一层层被磨平，反而更适合需要表达、判断、统筹或专业输出的位置。{dayun_text}如果能把自己的想法落成结果，这一步反而容易走开。"
        if geju_label in {"偏印格", "正印格"}:
            return f"事业上更适合靠理解力、专业度和长期积累往上走。{dayun_text}这一步，越是能沉住气、把经验做厚，后面反而越容易站稳。"
        if geju_label in {"正财格", "偏财格"}:
            return f"事业上更讲究现实兑现，不太适合一直悬着。{dayun_text}把资源、结果和投入产出这层推到眼前，越能把节奏放稳，越容易看见实际回报。"
        return f"事业这块更讲究方向对不对，而不是只看眼前顺不顺。{dayun_text}把一层现实主题推到面前，合适的做法往往是先理清重心，再选真正能积累的位置。"

    def public_persona_line() -> str:
        if head in {"偏印", "正印"}:
            return "给人的感觉多半是稳，不吵不闹，但心里一直在看轻重。表面不一定强势，真正相处下来会发现边界感很清楚。"
        if head in {"伤官", "食神"}:
            return "给人的感觉更像脑子快、反应快，很多事看一眼就能知道大概。未必会一直锋利，但很难被空话糊弄。"
        if head in {"正官", "七杀"}:
            return "给人的第一感觉往往是有分寸、也能扛事，所以很容易显得比同龄人更稳一点。"
        if head in {"正财", "偏财"}:
            return "给人的感觉偏现实，不太浮，做事会先看能不能落地，也很少真的把时间花在完全没结果的事情上。"
        return "给人的感觉不是张扬那一类，更像先看环境，再决定自己怎么站位。"

    def intimacy_line() -> str:
        if has_any("正官", "七杀") and has_any("偏印"):
            return "关系里最看重的，不是表面的热闹，而是这个人能不能让心里那口气慢慢放下来。会先看对方稳不稳、说话算不算，也因此更慢热。"
        if has_any("正官", "七杀") and has_any("正印"):
            return "关系里更看重长期相处的踏实感。不是容易被一时情绪带走的路子，往往会先看两个人能不能把日子慢慢过稳。"
        if has_any("伤官", "食神"):
            return "关系里最怕的是表面聊得热闹，最后却落不到真实。心里会很在意理解、回应和相处是不是顺，一旦别扭，感受往往比嘴上说出来的更深。"
        if has_any("偏印", "正印"):
            return "关系里不会一下子把自己摊开，更像先观察，再决定给到多少。真在意了会认真，但也容易把委屈先收着。"
        if has_any("正财", "偏财"):
            return "关系里不太吃飘忽那一套，更在意现实靠不靠谱，能不能一起往后走，而不是只停在当下的心动。"
        return "关系里不是没期待，而是不喜欢空转。比起一时上头，更在意能不能稳稳落下来。"

    def burnout_line() -> str:
        if dominant_element == "土":
            return "最容易发紧的时候，多半不是事情已经坏了，而是心里先把责任、后果和分寸都扛上来了。土气重的盘，怕的不是忙，而是一直撑着不松。"
        if dominant_element == "金":
            return "最容易内耗的地方，往往是标准太清楚。很多累不是没能力，而是心里那把尺一直在用力。"
        if dominant_element == "水":
            return "最容易消耗的时候，多半是心里一直在转，却没有一个真正能落下来的出口。想得快、感受也快，久了就容易把疲惫都收进自己这一头。"
        if dominant_element == "木":
            return "最容易发紧的时候，是想做的事太多，方向又一时没收住。木气重的盘，不怕起心动念，怕的是一直往前伸，却没及时回到自己的节奏里。"
        return "最容易累的，不是没路，而是一下子把自己烧太快。外面还没追上，心里就先急起来了。"

    def security_line() -> str:
        if has_any("正官", "正印"):
            return "真正能安住这张盘的关系，不是嘴上热烈，而是有回应、有边界、有稳定度。说话算数、情绪别太飘，这种关系才会让人慢慢放松。"
        if has_any("伤官", "食神"):
            return "最需要的安全感，是被理解，不是被管束。能接得住表达，也接得住情绪，不用一直猜来猜去，这种关系才更养这张盘。"
        if has_any("偏印", "正印"):
            return "最需要的安全感，不是对方一直来哄，而是心里那层戒备能不能慢慢放下来，能不能在关系里不用一直端着。"
        if has_any("正财", "偏财"):
            return "最需要的安全感，更多在现实细节里。不是说得多好听，而是相处下来能不能稳定、负责、让日子有落点。"
        return "最需要的关系安全感，不在形式上，而在相处里有没有真实回应。"

    def change_line() -> str:
        if current_dayun and ("官" in geju_label or has_any("正官", "七杀")):
            return f"{horizon_text}，变化更明显的地方多半在现实位置、责任分配和长期安排。{dayun_text}已经把“要不要更认真往前走”这层主题推到眼前。"
        if current_dayun and has_any("伤官", "食神"):
            return f"{horizon_text}，更明显的变化多半在表达方式、工作节奏和人际边界。{dayun_text}会把原本心里那套判断慢慢推到台前。"
        if current_dayun and has_any("偏印", "正印"):
            return f"{horizon_text}，更明显的变化会落在状态整理、方向取舍和内在秩序上。{dayun_text}像是在逼这张盘慢慢分清，什么该继续扛，什么该放下。"
        if current_dayun and has_any("正财", "偏财"):
            return f"{horizon_text}，更明显的变化会落在钱和现实安排上。{dayun_text}把取舍、投入和兑现这层推得更近。"
        return f"{horizon_text}，变化更明显的地方，多半落在现实安排和关系判断上。很多事会从“先放着”走到“不得不选”。"

    def annual_line() -> str:
        if focus == "relationship":
            return f"{horizon_text}更值得看的，不只是有没有人来，而是关系这层会被催熟，还是会先暴露出不合适的地方。先看{dayun_text}给了什么底色，再看流年是来推近，还是来试心。"
        if focus == "career":
            return f"{horizon_text}更值得看的，不只是顺不顺，而是哪一层位置、责任和能力会被先推出来。先看{dayun_text}给了什么底色，再看流年是来抬位置，还是来逼取舍。"
        if focus == "finance":
            return f"{horizon_text}更值得看的，不只是钱多不多，而是财这层到底是来得稳，还是花得快。先看{dayun_text}给了什么底色，再看流年碰到的是进账、投入，还是漏财点。"
        return f"{horizon_text}更值得看的，不只是顺不顺，而是哪一层主题会被先推出来。先看这步大运给了什么底色，再看流年是来催、来压，还是来打开新的口子。"

    def healing_parts() -> list[str]:
        if is_weak:
            parts = [
                f"这张盘先不用急着往重了看。{stem_text}眼下偏弱，很多时候不是没主见，而是外面的事还没发生，心里先把轻重缓急都过了一遍。",
                f"命盘里更显眼的是 {pair}，所以卡住的地方，常常不在事情表面，而在心里那杆秤一直衡量稳不稳、值不值。越想把自己放在一个万无一失的位置，反而越容易发紧。",
                f"真正养这张盘的，是 {favorable_text} 这一类能带来回应、流动和松动的环境。先把状态理顺，比急着逼自己做漂亮选择更重要。",
            ]
        elif is_strong:
            parts = [
                f"这张盘底子并不轻，也不是随便就会被带跑的路子。{stem_text}眼下偏旺，很多事心里本来就有一套判断，所以真正难的不是看不清，而是愿不愿意放下一点太用力的控制感。",
                f"命盘里以 {pair} 更显眼，说明这股劲不是虚张声势，而是心里真的有标准、有要求，也不喜欢被低质量的人和事来回磨。",
                f"更适合这张盘的，不是把自己压得更紧，而是把力气放到真正值得的地方。顺着 {favorable_text} 的气去走，很多原本僵着的地方，反而会慢慢松开。",
            ]
        else:
            parts = [
                f"这张盘难得的地方，在于不偏激。{stem_text}落在比较中和的位置，很多时候既感受得到外面的推力，也留得住自己的判断。",
                f"命盘里以 {pair} 更显眼，所以真正要紧的，不是去找一个绝对正确的答案，而是看眼前这件事到底是把状态推向更稳，还是推向更累。",
                f"顺着 {favorable_text} 去养状态，这张盘反而更容易把自己的节奏慢慢找回来。很多事不必急，先把心里的秤放平，后面的路自然会清楚一些。",
            ]

        if focus == "relationship":
            parts.append("感情这层，先别急着追问最后会不会成。更值得先看的是，这段关系让心里更松，还是更耗；让表达更自然，还是更想继续收着。")
        elif focus == "career":
            parts.append("事业这层，也不必急着用输赢来定。先看手上的位置是不是能积累能力、抬高判断、换来更稳的现实感，这样读会比只盯结果更贴这张盘。")
        elif focus == "finance":
            parts.append("财这层，先别急着问会不会突然进账。更值得先看的是，这笔钱会不会来得稳、守得住，也看自己会不会在某个地方反复多花力气。")

        return parts

    return {
        "overview": overview_line(),
        "career": career_line(),
        "publicPersona": public_persona_line(),
        "intimacy": intimacy_line(),
        "burnout": burnout_line(),
        "securityNeed": security_line(),
        "changeArea": change_line(),
        "annual": annual_line(),
        "healing": "||".join(healing_parts()),
    }


def calculate_bazi(payload: dict[str, Any]) -> dict[str, Any]:
    year_num, month_num, day_num = _parse_birthday_text(payload.get("birthday") or "")
    year_text = str(year_num)
    month_text = str(month_num)
    day_text = str(day_num)
    birth_time = _resolve_birth_time(payload)
    solar = Solar.fromYmdHms(
        year_num,
        month_num,
        day_num,
        birth_time.hour,
        birth_time.minute,
        birth_time.second,
    )
    lunar = solar.getLunar()
    eight_char = lunar.getEightChar()
    eight_char.setSect(2)

    include_time = payload.get("birthTime") or payload.get("timeRange") not in {"unknown", None, ""}

    pillars = [
        _pillar_payload(
            "年柱",
            eight_char.getYear(),
            eight_char.getYearGan(),
            eight_char.getYearZhi(),
            eight_char.getYearShiShenGan(),
            list(eight_char.getYearShiShenZhi()),
            list(eight_char.getYearHideGan()),
            eight_char.getYearWuXing(),
            eight_char.getYearNaYin(),
            eight_char.getYearDiShi(),
        ),
        _pillar_payload(
            "月柱",
            eight_char.getMonth(),
            eight_char.getMonthGan(),
            eight_char.getMonthZhi(),
            eight_char.getMonthShiShenGan(),
            list(eight_char.getMonthShiShenZhi()),
            list(eight_char.getMonthHideGan()),
            eight_char.getMonthWuXing(),
            eight_char.getMonthNaYin(),
            eight_char.getMonthDiShi(),
        ),
        _pillar_payload(
            "日柱",
            eight_char.getDay(),
            eight_char.getDayGan(),
            eight_char.getDayZhi(),
            eight_char.getDayShiShenGan(),
            list(eight_char.getDayShiShenZhi()),
            list(eight_char.getDayHideGan()),
            eight_char.getDayWuXing(),
            eight_char.getDayNaYin(),
            eight_char.getDayDiShi(),
        ),
        _pillar_payload(
            "时柱",
            eight_char.getTime(),
            eight_char.getTimeGan(),
            eight_char.getTimeZhi(),
            eight_char.getTimeShiShenGan(),
            list(eight_char.getTimeShiShenZhi()),
            list(eight_char.getTimeHideGan()),
            eight_char.getTimeWuXing(),
            eight_char.getTimeNaYin(),
            eight_char.getTimeDiShi(),
            include=include_time,
        ),
    ]

    scores = _compute_element_scores(pillars)
    dominant_element = max(scores.items(), key=lambda item: item[1])[0]
    day_element = STEM_ELEMENTS[eight_char.getDayGan()]
    own_score = scores[day_element]
    max_score = max(scores.values())
    pattern = "日主偏旺" if own_score >= max_score else "日主中和" if own_score >= max_score - 1 else "日主偏弱"

    today = date.today()
    current_age = today.year - int(year_text) - ((today.month, today.day) < (int(month_text), int(day_text)))
    gender_flag = 1 if payload.get("gender") == "male" else 0
    yun = eight_char.getYun(gender_flag)
    dayun_items = []
    current_dayun = None
    for item in yun.getDaYun(9):
        info = {
            "index": item.getIndex(),
            "ganzhi": item.getGanZhi() or "小运",
            "startYear": item.getStartYear(),
            "endYear": item.getEndYear(),
            "startAge": item.getStartAge(),
            "endAge": item.getEndAge(),
        }
        dayun_items.append(info)
        if info["startAge"] <= current_age <= info["endAge"]:
            current_dayun = info

    ten_god_counts = _count_ten_gods(pillars)
    dominant_ten_gods = _dominant_ten_gods(ten_god_counts)
    geju = _infer_geju(pillars)
    favorable = _favorable_elements(day_element, pattern)
    analysis = _build_analysis(
        payload.get("name", "命主"),
        payload.get("focus", "overall"),
        payload.get("horizon", "3"),
        {"stem": eight_char.getDayGan(), "element": day_element, "pattern": pattern},
        dominant_element,
        favorable,
        geju,
        dominant_ten_gods,
        current_dayun,
    )
    natal_branches = [pillar["zhi"] for pillar in pillars if pillar["zhi"]]
    annual_cards = _build_annual_cards(eight_char.getDayGan(), natal_branches, today.year, int(payload.get("horizon", "3")), current_dayun)
    theme = _theme_payload(dominant_element, favorable)
    time_insight = _build_time_insight(payload, eight_char.getDayGan(), eight_char.getTime(), eight_char.getTimeZhi())

    prev_jie = lunar.getPrevJie()
    next_jie = lunar.getNextJie()
    return {
        "meta": {
            "sect": 2,
            "timeExact": birth_time.exact and bool(payload.get("birthTime")),
            "timeNote": birth_time.note,
            "birthSolar": solar.toYmdHms(),
            "birthLunar": lunar.toFullString(),
            "currentAge": current_age,
            "calculatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        },
        "pillars": pillars,
        "dayMaster": {
            "stem": eight_char.getDayGan(),
            "branch": eight_char.getDayZhi(),
            "element": day_element,
            "pattern": pattern,
        },
        "elements": scores,
        "dominantElement": dominant_element,
        "favorableElements": favorable,
        "theme": theme,
        "timeInsight": time_insight,
        "tenGods": {
            "counts": ten_god_counts,
            "dominant": dominant_ten_gods,
            "source": "《渊海子平》《五行、十神参考表》",
        },
        "geju": geju,
        "jieQi": {
            "previous": {"name": prev_jie.getName(), "solar": prev_jie.getSolar().toYmdHms()},
            "next": {"name": next_jie.getName(), "solar": next_jie.getSolar().toYmdHms()},
        },
        "luck": {
            "forward": yun.isForward(),
            "startYear": yun.getStartYear(),
            "startMonth": yun.getStartMonth(),
            "startDay": yun.getStartDay(),
            "startSolar": yun.getStartSolar().toYmd(),
            "currentDaYun": current_dayun,
            "items": dayun_items,
        },
        "annualCards": annual_cards,
        "analysis": analysis,
    }


def calculate_bazi_by_pillars(payload: dict[str, Any]) -> dict[str, Any]:
    year_pillar = _validate_pillar(payload.get("yearPillar") or "", "年柱")
    month_pillar = _validate_pillar(payload.get("monthPillar") or "", "月柱")
    day_pillar = _validate_pillar(payload.get("dayPillar") or "", "日柱")
    time_pillar = _validate_pillar(payload.get("timePillar") or "", "时柱", required=False)

    day_gan = day_pillar[0]
    pillars = [
        _pillar_from_ganzhi("年柱", year_pillar, day_gan),
        _pillar_from_ganzhi("月柱", month_pillar, day_gan),
        _pillar_from_ganzhi("日柱", day_pillar, day_gan),
        _pillar_from_ganzhi("时柱", time_pillar, day_gan) if len(time_pillar) == 2 else _pillar_payload("时柱", "", "", "", "", [], [], "", "", "", include=False),
    ]

    scores = _compute_element_scores(pillars)
    dominant_element = max(scores.items(), key=lambda item: item[1])[0]
    day_element = STEM_ELEMENTS[day_gan]
    own_score = scores[day_element]
    max_score = max(scores.values())
    pattern = "日主偏旺" if own_score >= max_score else "日主中和" if own_score >= max_score - 1 else "日主偏弱"
    favorable = _favorable_elements(day_element, pattern)
    ten_god_counts = _count_ten_gods(pillars)
    dominant_ten_gods = _dominant_ten_gods(ten_god_counts)
    geju = _infer_geju(pillars)
    natal_branches = [pillar["zhi"] for pillar in pillars if pillar["zhi"]]
    annual_cards = _build_annual_cards(day_gan, natal_branches, date.today().year, int(payload.get("horizon", "3")), None)
    analysis = _build_analysis(
        payload.get("name", "命主"),
        payload.get("focus", "overall"),
        payload.get("horizon", "3"),
        {"stem": day_gan, "element": day_element, "pattern": pattern},
        dominant_element,
        favorable,
        geju,
        dominant_ten_gods,
        None,
    )
    theme = _theme_payload(dominant_element, favorable)

    time_insight = {
        "mode": "manual-bazi",
        "label": "已直接输入八字",
        "summary": "当前结果基于你手动提供的四柱生成，适合先看命局结构、十神与流年主题。",
        "candidates": [{"branch": pillars[3]["zhi"], "pillar": pillars[3]["ganzhi"], "note": "这是你手动输入的时柱。"}] if pillars[3]["ganzhi"] != "未知" else [],
        "prompt": "如果之后愿意补充具体阳历生日与出生时间，还可以进一步计算更精确的起运时间和当前大运。",
    }

    return {
        "meta": {
            "sect": 2,
            "timeExact": bool(time_pillar),
            "timeNote": "当前为手动输入八字模式",
            "birthSolar": "未提供公历生日",
            "birthLunar": "未提供农历生日",
            "currentAge": None,
            "calculatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        },
        "pillars": pillars,
        "dayMaster": {
            "stem": day_gan,
            "branch": day_pillar[1],
            "element": day_element,
            "pattern": pattern,
        },
        "elements": scores,
        "dominantElement": dominant_element,
        "favorableElements": favorable,
        "theme": theme,
        "timeInsight": time_insight,
        "tenGods": {
            "counts": ten_god_counts,
            "dominant": dominant_ten_gods,
            "source": "《渊海子平》《五行、十神参考表》",
        },
        "geju": geju,
        "jieQi": {
            "previous": {"name": "未提供生日", "solar": "-"},
            "next": {"name": "未提供生日", "solar": "-"},
        },
        "luck": {
            "forward": None,
            "startYear": None,
            "startMonth": None,
            "startDay": None,
            "startSolar": "需补生日后计算",
            "currentDaYun": None,
            "items": [],
        },
        "annualCards": annual_cards,
        "analysis": analysis,
    }

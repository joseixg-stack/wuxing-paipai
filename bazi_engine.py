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
    favorable_text = "、".join(favorable)
    ten_god_names = [item["name"] for item in dominant_ten_gods[:3]]
    ten_god_text = "、".join(ten_god_names[:2]) if ten_god_names else "十神均衡"
    dayun_text = current_dayun["ganzhi"] if current_dayun else "当前阶段"

    if "正官" in ten_god_names and "偏印" in ten_god_names:
        personality = "按八字看，你给人的感觉多半是稳的，脑子也清。会先观察、先判断，不太会被人随便带着走，所以看起来常常比同龄人更有分寸。"
    elif "正官" in ten_god_names or "七杀" in ten_god_names:
        personality = "按八字看，你给人的印象往往是靠谱、能扛事，也有边界。不是特别会咋呼的类型，但关键时候反而更容易站得住。"
    elif "食神" in ten_god_names or "伤官" in ten_god_names:
        personality = "按八字看，你身上更有表达感和主见，不会什么都往心里压。别人通常能很快感受到你的想法和态度。"
    elif "偏印" in ten_god_names or "正印" in ten_god_names:
        personality = "按八字看，你给人的感觉偏安静、偏克制，不会一下子把自己摊开。熟了之后，反而会让人觉得细腻、有分寸。"
    else:
        personality = "按八字看，这不是特别外放的路数，更像先感受氛围，再决定自己要不要真正投入。"

    if "正官" in ten_god_names and "偏印" in ten_god_names:
        relationship_style = "感情这块，八字里看重的不是热闹，而是确定感。你不太像会被一时心动直接带走的人，更像先看对方稳不稳、真不真、值不值得长期认真。真正在意了，会很认真，但也容易把委屈和担心先收着。"
    elif "正官" in ten_god_names:
        relationship_style = "感情里你会更看重稳定、靠谱和长期性。比起热烈开场，你更在意对方能不能一直给到安全感。"
    elif "偏财" in ten_god_names or "正财" in ten_god_names:
        relationship_style = "感情里其实很看重投入感。不是不能热情，而是会先判断这段关系值不值得认真交付。"
    elif "偏印" in ten_god_names:
        relationship_style = "感情里需要自己的空间和节奏，不太会一下子把全部情绪讲出来。所以看起来会慢一点，但其实是在确认能不能安心靠近。"
    else:
        relationship_style = "这张盘看关系并不轻率，通常先要觉得舒服、踏实，才会慢慢把真心交出去。"

    if current_dayun:
        career_text = f"事业上，这张盘不太像完全靠运气吃饭的路数。现在走到 {dayun_text} 这一步，更适合把注意力放在长期积累和现实落地上，能慢慢做深、做稳的事，比一时起伏更合适。"
    else:
        career_text = "事业上，这张盘更适合走稳扎稳打的节奏，先把基础打牢，再去争取更大的空间，会比急着求结果更顺。"

    annual_text = f"未来 {horizon} 年里，比较适合把注意力放在节奏变化和机会窗口上。先看什么时候该推进、什么时候该稳住，比急着分吉凶更有帮助。"

    if "正官" in ten_god_names and "偏印" in ten_god_names:
        burnout_text = "最容易内耗的，不是没能力，而是明明已经很想做好，却还是会多想一步稳不稳、值不值。很多压力不是外面压过来的，是自己先在心里过了一遍。"
        security_text = "最需要的关系安全感，不是嘴上热闹，而是确定感。对方说话算数、情绪稳定、愿意给回应，这种关系才真的能让你慢慢放松。"
        change_text = "接下来两三年，变化更明显的地方多半在工作节奏、现实安排，还有你对关系边界的判断。很多事会逼着你从先扛着，走到认真选方向。"
    elif "正官" in ten_god_names or "七杀" in ten_god_names:
        burnout_text = "最容易内耗的时候，多半是责任感太重的时候。很多事外界未必要求满分，但你会先把标准提上去。"
        security_text = "最需要的是可靠和稳定。关系里有秩序、有回应，心里才会真正放松。"
        change_text = "接下来两三年变化更明显的，多半是工作压力、身份定位，以及你对未来安排的想法。"
    elif "偏印" in ten_god_names or "正印" in ten_god_names:
        burnout_text = "最容易内耗的时候，多半是想得多、感受也多的时候。很多话不是没有，只是会先在心里来回确认。"
        security_text = "最需要的关系安全感，是被理解、被尊重自己的节奏，而不是被催着立刻表态。"
        change_text = "接下来两三年更容易变化的，是内在想法、人际边界，还有你想把生活过成什么样。"
    else:
        burnout_text = "最容易内耗的时候，多半是在反复权衡、迟迟不想随便决定的时候。不是优柔寡断，而是真的会认真考虑后果。"
        security_text = "最需要的安全感，是相处舒服、没有太多消耗，也不用一直猜来猜去。"
        change_text = "接下来两三年比较容易变化的，是生活节奏和真正愿意投入的方向。"

    return {
        "overview": f"八字里先看日主和格局。你这张盘，日主是{day_master['stem']}{day_master['element']}，目前看属于{day_master['pattern']}，整体底色偏向{geju['label']}。最明显的地方在{ten_god_text}，所以这不是轻飘飘的命，很多判断、节奏和力量，都是越往后越明显。",
        "career": career_text,
        "publicPersona": personality,
        "intimacy": relationship_style,
        "burnout": burnout_text,
        "securityNeed": security_text,
        "changeArea": change_text,
        "annual": annual_text,
        "healing": f"《滴天髓》里讲，理乘气行岂有常。落到这张八字上，最明显的是 {dominant_element} 的气偏重，所以你做事不会特别飘，更像先看清楚、先想明白，再决定要不要往前走。这样的盘，不是没行动力，而是天生更在意分寸、后果和稳定度。||眼下真正容易卡住的，往往不是外面的事有多难，而是心里那杆秤一直在衡量值不值、稳不稳、会不会让自己吃亏。很多压力还没落下来，心里已经先接住了。所以这张盘最怕的不是慢，而是明明不舒服，还硬把自己放进不合适的位置里撑着。||真正对这张盘有帮助的，是 {favorable_text} 这类能带来回应、流动和舒展的环境。关系里有回应，事情里有节奏，生活里有一点缓冲，整个人就会慢慢松开。先别急着替自己下重结论，先把状态理顺，后面的路反而更容易看清。",
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

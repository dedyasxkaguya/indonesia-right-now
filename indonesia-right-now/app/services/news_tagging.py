import re
from typing import Any

from app.schemas.news import IGSContext

_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "ekonomi": (
        "ekonomi",
        "economy",
        "rupiah",
        "inflasi",
        "inflation",
        "pajak",
        "tax",
        "saham",
        "stock",
        "investasi",
        "investment",
        "bisnis",
        "business",
        "bank",
        "ekspor",
        "impor",
        "harga",
        "pasar",
        "market",
        "apbn",
    ),
    "pemerintahan": (
        "pemerintah",
        "government",
        "kementerian",
        "ministry",
        "menteri",
        "minister",
        "presiden",
        "president",
        "dpr",
        "dprd",
        "kebijakan",
        "policy",
        "gubernur",
        "governor",
        "bupati",
        "walikota",
    ),
    "kesehatan": (
        "kesehatan",
        "health",
        "rumah sakit",
        "hospital",
        "dokter",
        "doctor",
        "pasien",
        "patient",
        "penyakit",
        "disease",
        "vaksin",
        "vaccine",
        "obat",
        "medicine",
    ),
    "sosial": (
        "sosial",
        "social",
        "masyarakat",
        "community",
        "warga",
        "penduduk",
        "bansos",
        "bantuan sosial",
        "kemiskinan",
        "poverty",
        "pekerja",
        "buruh",
        "worker",
    ),
    "infrastruktur": (
        "infrastruktur",
        "infrastructure",
        "jalan",
        "road",
        "jembatan",
        "bridge",
        "jalan tol",
        "pembangunan",
        "construction",
        "bendungan",
        "pelabuhan",
        "bandara",
    ),
    "pendidikan": (
        "pendidikan",
        "education",
        "sekolah",
        "school",
        "universitas",
        "university",
        "siswa",
        "student",
        "guru",
        "teacher",
        "kampus",
    ),
    "hukum": (
        "hukum",
        "law",
        "pengadilan",
        "court",
        "hakim",
        "judge",
        "polisi",
        "police",
        "jaksa",
        "prosecutor",
        "tersangka",
        "korupsi",
        "corruption",
    ),
    "politik": (
        "politik",
        "politics",
        "pemilu",
        "election",
        "partai",
        "party",
        "kampanye",
        "campaign",
        "koalisi",
        "coalition",
    ),
    "lingkungan": (
        "lingkungan",
        "environment",
        "iklim",
        "climate",
        "polusi",
        "pollution",
        "hutan",
        "forest",
        "sampah",
        "waste",
    ),
    "bencana": (
        "bencana",
        "disaster",
        "gempa",
        "earthquake",
        "banjir",
        "flood",
        "longsor",
        "landslide",
        "letusan",
        "erupsi",
    ),
    "teknologi": (
        "teknologi",
        "technology",
        "digital",
        "internet",
        "artificial intelligence",
        "kecerdasan buatan",
        "aplikasi",
        "smartphone",
        "siber",
        "cyber",
    ),
    "olahraga": (
        "olahraga",
        "sport",
        "sepak bola",
        "football",
        "futsal",
        "basket",
        "badminton",
        "bulutangkis",
        "atlet",
        "athlete",
        "pertandingan",
        "match",
    ),
    "hiburan": (
        "hiburan",
        "entertainment",
        "film",
        "musik",
        "music",
        "konser",
        "concert",
        "selebritas",
        "celebrity",
        "artis",
    ),
    "transportasi": (
        "transportasi",
        "transportation",
        "kereta",
        "train",
        "pesawat",
        "aircraft",
        "penerbangan",
        "flight",
        "kapal",
        "ship",
        "lalu lintas",
        "traffic",
    ),
    "internasional": (
        "internasional",
        "international",
        "luar negeri",
        "overseas",
        "dunia",
        "world",
        "global",
        "asing",
        "foreign",
    ),
}

_CATEGORY_ALIASES = {
    "economy": "ekonomi",
    "business": "ekonomi",
    "finance": "ekonomi",
    "government": "pemerintahan",
    "public announcements": "pemerintahan",
    "public_announcements": "pemerintahan",
    "politics": "politik",
    "health": "kesehatan",
    "social": "sosial",
    "education": "pendidikan",
    "crime": "hukum",
    "law": "hukum",
    "infrastructure": "infrastruktur",
    "environment": "lingkungan",
    "disaster": "bencana",
    "technology": "teknologi",
    "sports": "olahraga",
    "sport": "olahraga",
    "entertainment": "hiburan",
    "transportation": "transportasi",
    "international": "internasional",
}

_IGS_CONTEXTS = {
    "ekonomi": IGSContext(label="Data Ekonomi IGS", url="/gov/ekonomi"),
    "kesehatan": IGSContext(label="Data Sosial IGS", url="/gov/sosial-publik"),
    "sosial": IGSContext(label="Data Sosial IGS", url="/gov/sosial-publik"),
    "infrastruktur": IGSContext(
        label="Data Infrastruktur IGS", url="/gov/infrastruktur"
    ),
}

_KEYWORD_PATTERNS = {
    category: tuple(
        re.compile(rf"(?<!\w){re.escape(keyword)}(?!\w)", re.IGNORECASE)
        for keyword in keywords
    )
    for category, keywords in _CATEGORY_KEYWORDS.items()
}


def categories_for_article(
    title: str, summary: str | None, source_categories: Any
) -> list[str]:
    text = f"{title} {summary or ''}".casefold()
    scores = {category: 0 for category in _CATEGORY_KEYWORDS}

    if isinstance(source_categories, list):
        for value in source_categories:
            if not isinstance(value, str):
                continue
            category = value.strip().casefold()
            normalized = _CATEGORY_ALIASES.get(category, category)
            if normalized in scores:
                scores[normalized] += 3

    for category, patterns in _KEYWORD_PATTERNS.items():
        scores[category] += sum(bool(pattern.search(text)) for pattern in patterns)

    ordered = sorted(
        (category for category, score in scores.items() if score),
        key=lambda category: (
            -scores[category],
            tuple(_CATEGORY_KEYWORDS).index(category),
        ),
    )[:3]
    if not ordered:
        ordered = ["umum", "berita"]
    elif len(ordered) == 1:
        ordered.append("umum" if ordered[0] != "umum" else "berita")
    return ordered


def igs_context_for_categories(categories: list[str]) -> list[IGSContext]:
    contexts: list[IGSContext] = []
    seen_urls: set[str] = set()
    for category in categories:
        normalized = _CATEGORY_ALIASES.get(category.casefold(), category.casefold())
        context = _IGS_CONTEXTS.get(normalized)
        if context is not None and context.url not in seen_urls:
            contexts.append(context)
            seen_urls.add(context.url)
    return contexts


def enrich_article(item: dict[str, Any]) -> dict[str, Any]:
    categories = categories_for_article(
        str(item.get("title") or ""),
        item.get("summary"),
        item.get("categories"),
    )
    item["categories"] = categories
    item["igs_context"] = [
        context.model_dump(mode="json")
        for context in igs_context_for_categories(categories)
    ]
    return item

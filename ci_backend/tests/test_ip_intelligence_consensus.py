"""Consensus IP intelligence: refuse false precision, verify routing."""

from services import ip_intelligence


def test_city_is_kept_when_two_independent_sources_agree_despite_accents():
    result = ip_intelligence._merge(
        "197.149.12.34",
        [
            {
                "source": "ipapi",
                "city": "N'Djamena",
                "region": "N'Djamena",
                "country": "Chad",
                "country_code": "TD",
                "timezone": "Africa/Ndjamena",
                "asn": "AS327802",
                "org": "MILLICOM CHAD SA",
            },
            {
                "source": "ipwhois",
                "city": "N'Djaména",
                "region": "N'Djaména",
                "country": "Chad",
                "country_code": "TD",
                "timezone": "Africa/Ndjamena",
                "asn": "AS327802",
                "org": "Millicom Chad SA",
            },
        ],
    )

    assert result["city"] == "N'Djamena"
    assert result["city_confirmed"] == "1"
    assert result["country"] == "Chad"
    assert result["country_confirmed"] == "1"
    assert result["timezone"] == "Africa/Ndjamena"
    assert ip_intelligence.location_label(result) == "N'Djamena, Chad"


def test_city_is_removed_when_sources_disagree():
    result = ip_intelligence._merge(
        "197.149.12.34",
        [
            {
                "source": "ipapi",
                "city": "N'Djamena",
                "country": "Chad",
                "country_code": "TD",
            },
            {
                "source": "ipwhois",
                "city": "Moundou",
                "country": "Chad",
                "country_code": "TD",
            },
        ],
    )

    assert "city" not in result
    assert result["country"] == "Chad"
    assert ip_intelligence.location_label(result) == "Chad"


def test_ripe_routing_wins_and_technical_subscriber_block_is_hidden():
    result = ip_intelligence._merge(
        "197.149.12.34",
        [
            {
                "source": "ipapi",
                "city": "N'Djamena",
                "country": "Chad",
                "asn": "AS327802",
                "company": "Subscribers_Block_3",
            },
            {
                "source": "ipwhois",
                "city": "N'Djamena",
                "country": "Chad",
                "asn": "AS327802",
                "org": "Millicom Chad SA",
            },
            {
                "source": "ripe",
                "asn": "AS327802",
                "prefix": "197.149.12.0/22",
                "org": "MILLICOM CHAD SA",
            },
        ],
    )

    assert result["asn"] == "AS327802"
    assert result["asn_verified"] == "1"
    assert result["network_org"] == "MILLICOM CHAD SA"
    assert result["prefix"] == "197.149.12.0/22"
    label = ip_intelligence.network_label(result)
    assert label == "AS327802 · MILLICOM CHAD SA · 197.149.12.0/22"
    assert "Subscribers_Block_3" not in label


def test_two_network_providers_can_verify_asn_if_ripe_is_temporarily_unavailable():
    result = ip_intelligence._merge(
        "197.149.12.34",
        [
            {"source": "ipapi", "asn": "AS327802", "org": "MILLICOM CHAD SA"},
            {"source": "ipwhois", "asn": "AS327802", "org": "Millicom Chad SA"},
        ],
    )
    assert result["asn_verified"] == "1"
    assert ip_intelligence.network_label(result).startswith("AS327802 ·")


def test_single_provider_asn_is_not_presented_as_verified_network():
    result = ip_intelligence._merge(
        "197.149.12.34",
        [{"source": "ipapi", "asn": "AS327802", "org": "MILLICOM CHAD SA"}],
    )
    assert "asn_verified" not in result
    assert ip_intelligence.network_label(result) == ""


def test_technical_network_pool_name_is_not_an_operator():
    assert ip_intelligence._safe_org("Subscribers_Block_3") == ""
    assert ip_intelligence._safe_org("dynamic_pool_12") == ""
    assert ip_intelligence._safe_org("MILLICOM CHAD SA") == "MILLICOM CHAD SA"


def test_country_iso_consensus_handles_chad_tchad_translation():
    result = ip_intelligence._merge(
        "154.73.166.190",
        [
            {
                "source": "maxmind",
                "city": "N'Djamena",
                "country": "Tchad",
                "country_code": "TD",
                "timezone": "Africa/Ndjamena",
            },
            {
                "source": "ipapi",
                "city": "N'Djaména",
                "country": "Chad",
                "country_code": "TD",
                "timezone": "Africa/Ndjamena",
            },
        ],
    )
    assert result["country_code"] == "TD"
    assert result["country_confirmed"] == "1"
    assert result["country"] == "Tchad"
    assert result["city_confirmed"] == "1"
    assert ip_intelligence.location_label(result) == "N'Djamena, Tchad"


def test_location_label_deduplicates_accent_variants():
    assert ip_intelligence.location_label(
        {
            "city": "N'Djamena",
            "region": "N'Djaména",
            "country": "Chad",
        }
    ) == "N'Djamena, Chad"


def test_real_as327802_provider_shapes_converge():
    result = ip_intelligence._merge(
        "154.73.166.190",
        [
            {
                "source": "ipapi",
                "city": "N'Djamena",
                "region": "N'Djamena",
                "country": "Chad",
                "timezone": "Africa/Ndjamena",
                "asn": "AS327802",
                "org": "MILLICOM CHAD SA",
                "company": "",
            },
            {
                "source": "ipwhois",
                "city": "N'Djamena",
                "region": "N'Djamena",
                "country": "Chad",
                "country_code": "TD",
                "timezone": "Africa/Ndjamena",
                "asn": "AS327802",
                "org": "MILLICOM CHAD SA",
            },
            {
                "source": "ripe",
                "asn": "AS327802",
                "prefix": "154.73.166.0/24",
                "org": "MILLICOM CHAD SA",
            },
        ],
    )

    assert ip_intelligence.location_label(result) == "N'Djamena, Chad"
    assert (
        ip_intelligence.network_label(result)
        == "AS327802 · MILLICOM CHAD SA · 154.73.166.0/24"
    )


def test_ipwho_prefers_isp_when_org_is_only_subscriber_block():
    connection = {
        "org": "Subscribers Block 2 Moov Africa Chad",
        "isp": "MILLICOM CHAD SA",
    }
    assert ip_intelligence._safe_org(connection["org"]) == ""
    assert ip_intelligence._safe_org(connection["isp"]) == "MILLICOM CHAD SA"


def test_ripe_duplicate_holder_is_collapsed():
    assert (
        ip_intelligence._safe_org("MILLICOM CHAD SA - MILLICOM CHAD SA")
        == "MILLICOM CHAD SA"
    )


def test_rdap_uses_registrant_organization_not_technical_person():
    payload = {
        "entities": [
            {
                "roles": ["technical"],
                "vcardArray": [
                    "vcard",
                    [["fn", {}, "text", "Network Engineer"]],
                ],
            },
            {
                "roles": ["registrant"],
                "vcardArray": [
                    "vcard",
                    [
                        ["kind", {}, "text", "org"],
                        ["fn", {}, "text", "MILLICOM CHAD SA"],
                    ],
                ],
            },
        ]
    }
    assert ip_intelligence._rdap_registrant_name(payload) == "MILLICOM CHAD SA"


def test_afrinic_operator_overrides_technical_provider_label():
    result = ip_intelligence._merge(
        "154.73.167.12",
        [
            {
                "source": "ipapi",
                "city": "N'Djamena",
                "country": "Chad",
                "asn": "AS327802",
                "org": "MILLICOM CHAD SA",
                "company": "Subscribers_Block_3",
            },
            {
                "source": "ipwhois",
                "city": "N'Djamena",
                "country": "Chad",
                "country_code": "TD",
                "asn": "AS327802",
                "org": "MILLICOM CHAD SA",
            },
            {
                "source": "ripe",
                "asn": "AS327802",
                "prefix": "154.73.167.0/24",
                "org": "MILLICOM CHAD SA",
            },
            {
                "source": "afrinic",
                "asn": "AS327802",
                "operator_name": "MILLICOM CHAD SA",
            },
        ],
    )

    assert result["operator_name"] == "MILLICOM CHAD SA"
    assert result["operator_verified"] == "1"
    assert (
        ip_intelligence.network_label(result)
        == "AS327802 · MILLICOM CHAD SA · 154.73.167.0/24"
    )
    assert "Subscribers_Block_3" not in ip_intelligence.network_label(result)


def test_network_label_never_falls_back_to_raw_network_org():
    result = {
        "asn_verified": "1",
        "asn": "AS327802",
        "network_org": "Subscribers_Block_3",
        "prefix": "154.73.167.0/24",
    }
    assert ip_intelligence.network_label(result) == "AS327802 · 154.73.167.0/24"


def test_empty_maxmind_without_mmdb_does_not_count_as_source(monkeypatch):
    monkeypatch.delenv("SECURITY_GEOIP_CITY_DB", raising=False)
    monkeypatch.delenv("SECURITY_GEOIP_ASN_DB", raising=False)
    assert ip_intelligence._maxmind_signal("154.73.167.1") == {}

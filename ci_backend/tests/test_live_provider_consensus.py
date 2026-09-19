import pytest
from services import ip_intelligence


@pytest.mark.asyncio
async def test_live_as327802_consensus():
    data = await ip_intelligence.lookup("154.73.166.190")
    place = ip_intelligence.location_label(data)
    network = ip_intelligence.network_label(data)

    print({
        "place": place,
        "network": network,
        "asn_verified": data.get("asn_verified"),
        "geo_sources": data.get("geo_sources"),
        "network_sources": data.get("network_sources"),
    })

    assert data.get("asn_verified") == "1"
    assert data.get("asn") == "AS327802"
    assert data.get("prefix") == "154.73.166.0/24"
    assert place in {"N'Djamena, Chad", "N'Djaména, Chad"}
    assert "MILLICOM CHAD SA" in network
    assert "Subscribers" not in network

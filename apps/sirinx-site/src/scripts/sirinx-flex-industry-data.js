/**
 * SIRINX Flex Industry Data — LINE Flex Message Templates
 * Version 1.0.0
 *
 * Provides industry-specific project carousel templates for the SIRINX LINE OA bot.
 * Thai language content. SIRINX brand colors throughout.
 *
 * Brand Colors:
 *   Primary: #00D4AA
 *   Dark:    #0a1628
 *   Surface: #1a2744
 *   Accent:  #00A3FF
 *   Text:    #f7faf4
 *   Muted:   #9fb5ac
 */

window.SIRINX_FLEX_DATA = (function () {
  var CID = "304zrttj";

  function uriAction(label, text) {
    return {
      type: "uri",
      label: label,
      uri: "https://line.me/R/oaMessage/%40" + CID + "/?text=" + encodeURIComponent(text)
    };
  }

  function bubble(id, heroUrl, projectName, location, specs, savings, status, statusColor, detailText) {
    return {
      type: "bubble",
      hero: {
        type: "image",
        url: heroUrl,
        size: "full",
        aspectRatio: "3:2",
        aspectMode: "cover",
        backgroundColor: "#0a1628"
      },
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0a1628",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          {
            type: "text",
            text: projectName,
            weight: "bold",
            size: "lg",
            color: "#f7faf4",
            wrap: true,
            maxLines: 2
          },
          {
            type: "text",
            text: location,
            size: "sm",
            color: "#9fb5ac",
            wrap: true,
            margin: "sm"
          },
          {
            type: "separator",
            color: "#1a2744",
            margin: "md"
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "md",
            contents: [
              {
                type: "text",
                text: specs,
                size: "sm",
                color: "#9fb5ac",
                wrap: true
              },
              {
                type: "text",
                text: savings ? "ประหยัดค่าไฟ " + savings + "/เดือน" : "",
                size: "sm",
                color: "#00D4AA",
                weight: "bold",
                wrap: true,
                margin: "sm"
              }
            ]
          },
          {
            type: "box",
            layout: "baseline",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "สถานะ: ",
                size: "xs",
                color: "#9fb5ac",
                flex: 0
              },
              {
                type: "text",
                text: status,
                size: "xs",
                color: statusColor,
                weight: "bold",
                flex: 0
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0a1628",
        spacing: "sm",
        paddingAll: "12px",
        paddingTop: "0px",
        contents: [
          {
            type: "button",
            action: uriAction("\u0E04\u0E38\u0E22\u0E01\u0E31\u0E1A\u0E17\u0E35\u0E21 SIRINX", detailText),
            style: "primary",
            color: "#00D4AA",
            height: "sm"
          }
        ]
      }
    };
  }

  var projects = {
    "phitsanulok-hotel": {
      id: "phitsanulok-hotel",
      hero: "https://placehold.co/600x400/0a1628/00D4AA?text=%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%81%E0%B8%A3%E0%B8%A1%E0%B9%80%E0%B8%A3%E0%B8%B7%E0%B8%AD%E0%B8%99%E0%B9%81%E0%B8%9E+%E0%B8%9E%E0%B8%B4%E0%B8%A9%E0%B8%93%E0%B8%B8%E0%B9%82%E0%B8%A5%E0%B8%81",
      name: "\u0E42%E0%B8%A3\u0E07\u0E41\u0E23\u0E21\u0E40\u0E23\u0E37\u0E2D\u0E19\u0E41\u0E1E \u0E23\u0E2D\u0E22\u0E31\u0E25\u0E1B\u0E32\u0E23\u0E4C\u0E04",
      location: "\u0E08.\u0E1E\u0E34\u0E29\u0E13\u0E38\u0E42\u0E25\u0E01",
      specs: "\u0E42\u0E0B\u0E25\u0E32\u0E48\u0E32\u0E23\u0E30\u0E1A\u0E9A\u0E44\u0E2E\u0E1A\u0E23\u0E34\u0E14 + BESS + AI EMS\nSolar Farm Node 1 \u0E02\u0E19\u0E32\u0E14 82 kWp",
      savings: "\u0E1B\u0E23\u0E30\u0E2B\u0E22\u0E31\u0E14\u0E04\u0E48\u0E32\u0E44\u0E1F ~50,000 \u0E1A\u0E32\u0E17",
      status: "\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E22\u0E39\u0E48 (Solar Farm Node 1)",
      statusColor: "#00D4AA",
      detail: "\u0E2A\u0E19\u0E43\u0E08\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 Solar Farm \u0E42\u0E23\u0E07\u0E41\u0E23\u0E21\u0E40\u0E23\u0E37\u0E2D\u0E19\u0E41\u0E1E \u0E23\u0E2D\u0E22\u0E31\u0E25\u0E1B\u0E32\u0E23\u0E4C\u0E04 \u0E08.\u0E1E\u0E34\u0E29\u0E13\u0E38\u0E42\u0E25\u0E01"
    },
    "nan-hotel": {
      id: "nan-hotel",
      hero: "https://placehold.co/600x400/0a1628/00D4AA?text=%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%81%E0%B8%A3%E0%B8%A1%E0%B9%82%E0%B8%AE%E0%B8%A5%E0%B8%B2%E0%B9%80%E0%B8%97%E0%B8%A5+%E0%B8%99%E0%B9%88%E0%B8%B2%E0%B8%99",
      name: "\u0E42\u0E23\u0E07\u0E41\u0E23\u0E21\u0E42\u0E2E\u0E25\u0E32\u0E40\u0E17\u0E25\u0E23\u0E34\u0E21\u0E19\u0E48\u0E32\u0E19",
      location: "\u0E08.\u0E19\u0E48\u0E32\u0E19",
      specs: "\u0E42\u0E0B\u0E25\u0E32\u0E48\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E2E\u0E1A\u0E23\u0E34\u0E14 + BESS + Smart Hotel System\nSolar Farm Node 2 \u0E02\u0E19\u0E32\u0E14 62 kWp",
      savings: "\u0E1B\u0E23\u0E30\u0E2B\u0E22\u0E31\u0E14\u0E04\u0E48\u0E32\u0E44\u0E1F ~35,000 \u0E1A\u0E32\u0E17",
      status: "\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E22\u0E39\u0E48 (Solar Farm Node 2)",
      statusColor: "#00D4AA",
      detail: "\u0E2A\u0E19\u0E43\u0E08\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 Solar Farm \u0E42\u0E23\u0E07\u0E41\u0E23\u0E21\u0E42\u0E2E\u0E25\u0E32\u0E40\u0E17\u0E25\u0E23\u0E34\u0E21\u0E19\u0E48\u0E32\u0E19 \u0E08.\u0E19\u0E48\u0E32\u0E19"
    },
    "ayutthaya-factory": {
      id: "ayutthaya-factory",
      hero: "https://placehold.co/600x400/0a1628/00D4AA?text=%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%8A%E0%B8%B4%E0%B9%89%E0%B8%99%E0%B8%AA%E0%B9%88%E0%B8%A7%E0%B8%99%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B8%95%E0%B9%8C+%E0%B8%AD%E0%B8%A2%E0%B8%B8%E0%B8%98%E0%B8%A2%E0%B8%B2",
      name: "\u0E42\u0E23\u0E07\u0E07\u0E32\u0E19\u0E1C\u0E25\u0E34\u0E15\u0E0A\u0E34\u0E49\u0E19\u0E2A\u0E48\u0E27\u0E19\u0E22\u0E32\u0E19\u0E15\u0E4C",
      location: "\u0E19\u0E34\u0E04\u0E21\u0E2D\u0E38\u0E15\u0E2A\u0E32\u0E2B\u0E01\u0E23\u0E23\u0E21 \u0E08.\u0E1E\u0E23\u0E30\u0E19\u0E04\u0E23\u0E28\u0E23\u0E35\u0E2D\u0E22\u0E38\u0E18\u0E22\u0E32",
      specs: "Solar Rooftop 500 kWp\nBESS 200 kWh\n\u0E23\u0E30\u0E1A\u0E1A AI Energy Management",
      savings: "~350,000 \u0E1A\u0E32\u0E17",
      status: "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23",
      statusColor: "#00D4AA",
      detail: "\u0E2A\u0E19\u0E43\u0E08\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 Solar Rooftop \u0E42\u0E23\u0E07\u0E07\u0E32\u0E19\u0E0A\u0E34\u0E49\u0E19\u0E2A\u0E48\u0E27\u0E19\u0E22\u0E32\u0E19\u0E15\u0E4C \u0E08.\u0E1E\u0E23\u0E30\u0E19\u0E04\u0E23\u0E28\u0E23\u0E35\u0E2D\u0E22\u0E38\u0E18\u0E22\u0E32"
    },
    "bangkok-mall": {
      id: "bangkok-mall",
      hero: "https://placehold.co/600x400/0a1628/00D4AA?text=%E0%B8%AB%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%AA%E0%B8%A3%E0%B8%A3%E0%B8%9E%E0%B8%AA%E0%B8%B4%E0%B8%99%E0%B8%84%E0%B9%89%E0%B8%B2+%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E",
      name: "\u0E2B\u0E49\u0E32\u0E07\u0E2A\u0E23\u0E23\u0E1E\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E0A\u0E31\u0E49\u0E19\u0E19\u0E33",
      location: "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23",
      specs: "Solar Carport 800 kWp\n\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E2D\u0E31\u0E14 EV 20 \u0E2B\u0E31\u0E27\nBESS 400 kWh",
      savings: "~480,000 \u0E1A\u0E32\u0E17",
      status: "\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E23\u0E49\u0E2D\u0E22",
      statusColor: "#00A3FF",
      detail: "\u0E2A\u0E19\u0E43\u0E08\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 Solar Carport \u0E2B\u0E49\u0E32\u0E07\u0E2A\u0E23\u0E23\u0E1E\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23"
    },
    "pattaya-hotel": {
      id: "pattaya-hotel",
      hero: "https://placehold.co/600x400/0a1628/00D4AA?text=%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%81%E0%A3%E0%B8%A1%E0%B8%A3%E0%B8%B5%E0%B8%AA%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%97+%E0%B8%9E%E0%B8%B1%E0%B8%97%E0%B8%A2%E0%B8%B2",
      name: "\u0E42\u0E23\u0E07\u0E41\u0E23\u0E21 \u0E23\u0E35\u0E2A\u0E2D\u0E23\u0E4C\u0E17\u0E1E\u0E31\u0E17\u0E22\u0E32",
      location: "\u0E08.\u0E0A\u0E25\u0E1A\u0E38\u0E23\u0E35",
      specs: "Solar Rooftop 300 kWp\nBESS 150 kWh\n\u0E23\u0E30\u0E1A\u0E1A AI EMS \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E42\u0E23\u0E07\u0E41\u0E23\u0E21",
      savings: "~210,000 \u0E1A\u0E32\u0E17",
      status: "\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E23\u0E49\u0E2D\u0E22",
      statusColor: "#00A3FF",
      detail: "\u0E2A\u0E19\u0E43\u0E08\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 Solar Rooftop \u0E42\u0E23\u0E07\u0E41\u0E23\u0E21\u0E23\u0E35\u0E2A\u0E2D\u0E23\u0E4C\u0E17 \u0E08.\u0E0A\u0E25\u0E1A\u0E38\u0E23\u0E35"
    },
    "chonburi-gasstation": {
      id: "chonburi-gasstation",
      hero: "https://placehold.co/600x400/0a1628/00D4AA?text=%E0%B8%9B%E0%B8%B1%E0%B9%8A%E0%B8%A1%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%A1%E0%B8%B1%E0%B8%99+%E0%B8%8A%E0%B8%A5%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5",
      name: "\u0E1B\u0E31\u0E4A\u0E21\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19\u0E1E\u0E23\u0E30\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C",
      location: "\u0E08.\u0E0A\u0E25\u0E1A\u0E38\u0E23\u0E35",
      specs: "Solar Canopy 150 kWp\n\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E2D\u0E31\u0E14 EV 4 \u0E2B\u0E31\u0E27\nBESS 80 kWh",
      savings: "~90,000 \u0E1A\u0E32\u0E17",
      status: "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23",
      statusColor: "#00D4AA",
      detail: "\u0E2A\u0E19\u0E43\u0E08\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 Solar Canopy \u0E1B\u0E31\u0E4A\u0E21\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19 \u0E08.\u0E0A\u0E25\u0E1A\u0E38\u0E23\u0E35"
    },
    "bangkok-office": {
      id: "bangkok-office",
      hero: "https://placehold.co/600x400/0a1628/00D4AA?text=%E0%B8%AD%E0%B8%B2%E0%B8%84%E0%B8%B2%E0%B8%A3%E0%B8%AA%E0%B8%B3%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99+%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E",
      name: "\u0E2D\u0E32\u0E04\u0E32\u0E23\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E01\u0E23\u0E14 A",
      location: "\u0E43\u0E08\u0E01\u0E25\u0E32\u0E07\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23",
      specs: "Solar Rooftop 250 kWp\n\u0E23\u0E30\u0E1A\u0E1A AI EMS\n\u0E23\u0E30\u0E1A\u0E1A\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19",
      savings: "~160,000 \u0E1A\u0E32\u0E17",
      status: "\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E22\u0E39\u0E48",
      statusColor: "#00D4AA",
      detail: "\u0E2A\u0E19\u0E43\u0E08\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 Solar Rooftop \u0E2D\u0E32\u0E04\u0E32\u0E23\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19 \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23"
    },
    "khonkaen-school": {
      id: "khonkaen-school",
      hero: "https://placehold.co/600x400/0a1628/00D4AA?text=%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99%E0%B8%99%E0%B8%B2%E0%B8%99%E0%B8%B2%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4+%E0%B8%82%E0%B8%AD%E0%B8%99%E0%B9%81%E0%B8%81%E0%B9%88%E0%B8%99",
      name: "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E19\u0E32\u0E19\u0E32\u0E0A\u0E32\u0E15\u0E34\u0E02\u0E2D\u0E19\u0E41\u0E01\u0E48\u0E19",
      location: "\u0E08.\u0E02\u0E2D\u0E19\u0E41\u0E01\u0E48\u0E19",
      specs: "Solar Carport 200 kWp\n\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19\u0E2D\u0E31\u0E08\u0E09\u0E23\u0E34\u0E22\u0E30\n\u0E23\u0E31\u0E1A\u0E23\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E2D\u0E19\u0E14\u0E49\u0E32\u0E19\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19\u0E2A\u0E30\u0E2D\u0E32\u0E14",
      savings: "~90,000 \u0E1A\u0E32\u0E17",
      status: "\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E23\u0E49\u0E2D\u0E22",
      statusColor: "#00A3FF",
      detail: "\u0E2A\u0E19\u0E43\u0E08\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 Solar Carport \u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E19\u0E32\u0E19\u0E32\u0E0A\u0E32\u0E15\u0E34 \u0E08.\u0E02\u0E2D\u0E19\u0E41\u0E01\u0E48\u0E19"
    }
  };

  function buildBubble(id) {
    var p = projects[id];
    if (!p) return null;
    return bubble(
      p.id,
      p.hero,
      p.name,
      p.location,
      p.specs,
      p.savings,
      p.status,
      p.statusColor,
      p.detail
    );
  }

  var carouselMap = {
    "factory": ["ayutthaya-factory"],
    "gas-station": ["chonburi-gasstation"],
    "mall": ["bangkok-mall"],
    "hotel": ["pattaya-hotel", "phitsanulok-hotel", "nan-hotel"],
    "office": ["bangkok-office"],
    "school": ["khonkaen-school"]
  };

  function buildCarousel(ids) {
    var contents = [];
    for (var i = 0; i < ids.length; i++) {
      var b = buildBubble(ids[i]);
      if (b) contents.push(b);
    }
    return contents;
  }

  return {
    version: "1.0.0",
    projects: projects,
    industryCarousels: (function () {
      var result = {};
      for (var key in carouselMap) {
        if (carouselMap.hasOwnProperty(key)) {
          result[key] = buildCarousel(carouselMap[key]);
        }
      }
      return result;
    })(),
    getCarouselForIndustry: function (industryId) {
      var ids = carouselMap[industryId];
      if (!ids) return [];
      return buildCarousel(ids);
    },
    getProjectBubble: function (projectId) {
      return buildBubble(projectId);
    }
  };
})();

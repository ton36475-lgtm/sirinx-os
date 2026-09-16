window.SIRINX_INTENT_PATTERNS = {
  version: "1.0.0",

  patterns: {
    roi_calculator: {
      priority: 95,
      patterns: [
        "\\b(?:roi|return\\s*on\\s*investment)\\b",
        "\\b(?:payback|pay\\s*back|break\\s*even)\\b",
        "\\b(?:saving|savings?|save\\s*energy|cost\\s*savings?)\\b",
        "\\b(?:electricity\\s*bill|power\\s*bill|energy\\s*cost)\\b",
        "ค่าไฟ",
        "คืนทุน",
        "ผลประหยัด",
        "ประหยัดค่าไฟ",
        "คิดเลข",
        "คำนวณผลประหยัด"
      ],
      keywords: [
        "ค่าไฟ",
        "คืนทุน",
        "ผลประหยัด",
        "คิดเลข",
        "คำนวณ"
      ],
      responseHint: { thai: "แสดงผลการคำนวณ ROI", english: "Show ROI calculation result" },
      exclusionPatterns: [
      ],
      confidenceBoost: 0.4
    },
    quote_request: {
      priority: 90,
      patterns: [
        "\\b(?:quote|quotation|price\\s*list|pricing)\\b",
        "\\b(?:how\\s*much|what\\s*(?:is\\s*)?the\\s*price|cost\\s*estimate)\\b",
        "\\b(?:request\\s*(?:a\\s*)?quote|get\\s*a\\s*quote|send\\s*quote)\\b",
        "ราคา",
        "เท่าไหร่",
        "ราคาถูก",
        "ขอใบเสนอราคา",
        "ขอแบบประเมินราคา",
        "ราคาต่อหน่วย",
        "ค่าติดตั้ง"
      ],
      keywords: [
        "ราคา",
        "เท่าไหร่",
        "ใบเสนอราคา",
        "ราคาถูก",
        "แบบประเมิน"
      ],
      responseHint: { thai: "ขอรายละเอียดและส่งใบเสนอราคา", english: "Request details and send quotation" },
      exclusionPatterns: [
        "\\b(?:price\\s*list\\s*of\\s*menu|menu\\s*price)\\b"
      ],
      confidenceBoost: 0.35
    },
    project_inquiry: {
      priority: 85,
      patterns: [
        "\\b(?:project|projects|reference|case\\s*study)\\b",
        "\\b(?:portfolio|past\\s*work|done\\s*before|installed)\\b",
        "\\b(?:example\\s*installation|sample\\s*project|show\\s*me\\s*your)\\b",
        "โปรเจกต์",
        "ผลงาน",
        "งานที่ทำ",
        "ตัวอย่างโครงการ",
        "เคสสแสดงงาน",
        "ผลงานที่ผ่านมา",
        "โครงการติดตั้ง"
      ],
      keywords: [
        "โปรเจกต์",
        "ผลงาน",
        "งานที่ทำ",
        "ตัวอย่าง",
        "เคสสแสดงงาน"
      ],
      responseHint: { thai: "แสดงตัวอย่างโครงการที่คัดเลือก", english: "Show selected project examples" },
      exclusionPatterns: [
      ],
      confidenceBoost: 0.35
    },
    ai_ems_demo: {
      priority: 80,
      patterns: [
        "\\b(?:ai\\s*energy\\s*management|ai\\s*ems|energy\\s*management\\s*system)\\b",
        "ไอจัดการพลังงาน",
        "ไอบริหารพลังงาน",
        "ไออีเอ็มเอส",
        "\\b(?:smart\\s*energy|intelligent\\s*energy|energy\\s*optimiza)",
        "\\b(?:demo\\s*ems|ems\\s*demo|try\\s*ems|show\\s*ems)\\b",
        "\\b(?:energy\\s*monitoring|energy\\s*analytics|power\\s*management\\s*ai)\\b",
        "ระบบจัดการอัจฉริยะ",
        "พลังงานอัจฉริยะ",
        "แสดงผลอัจฉริยะ",
        "สถิติระบบจัดการพลังงาน",
        "ลองใช้ระบบจัดการพลังงาน"
      ],
      keywords: [
        "อัจฉริยะ",
        "จัดการพลังงาน",
        "ems",
        "พลังงานอัจฉริยะ",
        "ai energy"
      ],
      responseHint: { thai: "เสนอแสดงงาน AI EMS demo", english: "Offer AI EMS demo presentation" },
      exclusionPatterns: [
        "\\b(?:ems\\s*ambulance|ems\\s*team|ems\\s*worker)\\b"
      ],
      confidenceBoost: 0.4
    },
    ev_charger: {
      priority: 78,
      patterns: [
        "\\b(?:ev\\s*charger|ev\\s*charging|electric\\s*vehicle\\s*charger)\\b",
        "\\b(?:charging\\s*station|charge\\s*point|wallbox|charge\\s*box)\\b",
        "ชาร์จ",
        "รถไฟฟ้า",
        "\\b(?:ev\\s*plug|type\\s*2|chademo|ccs)\\b",
        "สถานีชาร์จ",
        "หัวชาร์จ",
        "ตู้ชาร์จ",
        "\\b(?:ev\\s*station|charger\\s*installation|install\\s*charger)\\b",
        "ติดตั้งตู้ชาร์จ"
      ],
      keywords: [
        "ชาร์จ",
        "รถไฟฟ้า",
        "สถานีชาร์จ",
        "ev charger",
        "ตู้ชาร์จ"
      ],
      responseHint: { thai: "เสนอข้อมูลตู้ชาร์จ EV", english: "Present EV charger product info" },
      exclusionPatterns: [
        "\\b(?:event|every|ever|evening|eventually)\\b"
      ],
      confidenceBoost: 0.3
    },
    bess_inquiry: {
      priority: 75,
      patterns: [
        "\\b(?:bess|battery\\s*energy\\s*storage\\s*system)\\b",
        "\\b(?:energy\\s*storage|storage\\s*battery|battery\\s*storage)\\b",
        "แบตเตอรี่",
        "การกักเก็บพลังงาน",
        "\\b(?:lithium\\s*battery|battery\\s*pack|solar\\s*battery)\\b",
        "ลิเทียมแบตเตอรี่",
        "แบตต่างๆ",
        "ระบบกักเก็บพลังงาน",
        "\\b(?:home\\s*battery|backup\\s*battery|off\\s*grid\\s*battery)\\b",
        "แบตฉุกเฉิน"
      ],
      keywords: [
        "แบตเตอรี่",
        "กักเก็บพลังงาน",
        "battery storage",
        "bess",
        "ระบบกักเก็บพลังงาน"
      ],
      responseHint: { thai: "เสนอข้อมูลระบบ BESS และแบตเตอรี่", english: "Share BESS system and battery info" },
      exclusionPatterns: [
        "\\b(?:bessie|bessy|bess\\s+(?:is|was|and|my|her|his|has|the|a\\b))\\b",
        "\\b(?:bess\\s*friend|bess\\s*day)\\b"
      ],
      confidenceBoost: 0.35
    },
    solar_carport: {
      priority: 73,
      patterns: [
        "\\b(?:solar\\s*carport|carport\\s*solar|car\\s*port)\\b",
        "\\b(?:parking\\s*solar|solar\\s*canopy|solar\\s*shade)\\b",
        "ที่จอดรถ",
        "หลังคาจอดรถ",
        "\\b(?:carport\\s*installation|install\\s*carport|carport\\s*project)\\b",
        "โซล่าเซล์รถยนต์",
        "ลานจอดรถโซล่าเซล์",
        "หลังคารถเพื่อจอดรถ",
        "ที่จอดรถประยาดับโซล่าเซล์",
        "\\b(?:ev\\s*carport|carport\\s*with\\s*solar|carport\\s*panel)\\b"
      ],
      keywords: [
        "carport",
        "ที่จอดรถ",
        "หลังคาจอดรถ",
        "โซล่าเซล์รถยนต์",
        "solar carport"
      ],
      responseHint: { thai: "เสนอแบบจำลอง Solar Carport", english: "Present Solar Carport solutions" },
      exclusionPatterns: [
      ],
      confidenceBoost: 0.3
    },
    human_handoff: {
      priority: 100,
      patterns: [
        "\\b(?:talk\\s*to\\s*(?:a\\s*)?(?:human|person|agent|representative))\\b",
        "\\b(?:speak\\s*to\\s*(?:a\\s*)?(?:human|person|agent|staff))\\b",
        "\\b(?:connect\\s*me|transfer\\s*me|forward\\s*me|switch\\s*me)\\b",
        "คุยกับคน",
        "แจ้งพนักงาน",
        "ต้องการพูดคุยกับจริง",
        "ติดต่อพนักงาน",
        "ยกเรื่องให้พนักงาน",
        "สายตรงถึงพนักงาน",
        "\\b(?:customer\\s*service|support\\s*team|call\\s*center)\\b",
        "คุยกับพนักงาน",
        "ติดต่อเจ้าหน้าที่"
      ],
      keywords: [
        "คุยกับคน",
        "แจ้งพนักงาน",
        "พูดคุยกับจริง",
        "talk to human",
        "ติดต่อพนักงาน",
        "คุยกับพนักงาน",
        "ติดต่อเจ้าหน้าที่"
      ],
      responseHint: { thai: "โอนเวนสายตรงไปยังพนักงาน", english: "Offer transfer to human agent" },
      exclusionPatterns: [
      ],
      confidenceBoost: 0.5
    },
    greeting: {
      priority: 40,
      patterns: [
        "\\b(?:hello|hi\\b|hey|greetings|good\\s*(?:morning|afternoon|evening))\\b",
        "สวัสดี",
        "โม้",
        "\\b(?:howdy|what\\s*'?s\\s*up|sup\\b|yo\\b)",
        "\\b(?:nice\\s*to\\s*meet|pleased\\s*to\\s*meet|good\\s*day)\\b",
        "ไหม่สวัสดี",
        "สวัสดีจ้า",
        "สวัสดีครับ",
        "ทักษาทักไทยเดอะ",
        "รับประจำคะ"
      ],
      keywords: [
        "สวัสดี",
        "hello",
        "โม้"
      ],
      responseHint: { thai: "ทักทายและเสนอบริการ", english: "Greet and offer services" },
      exclusionPatterns: [
        "\\b(?:hell\\b|hellish|hello\\s*kitty)\\b"
      ],
      confidenceBoost: 0.1
    },
    faq: {
      priority: 30,
      patterns: [
        "\\b(?:help|what\\s*can\\s*you|how\\s*can\\s*you\\s*help|what\\s*do\\s*you\\s*do)\\b",
        "\\b(?:feature|capabilities|what\\s*services|what\\s*products)\\b",
        "\\b(?:question|faq|info|information)\\b",
        "ช่วย",
        "มีอะไรบ้าง",
        "ทำอะไรได้บ้าง",
        "ข้อมูลเพิ่มเติม",
        "ใช้งานยังไง",
        "สอนวิธีใช้",
        "\\b(?:tutorial|guide|how\\s*to\\s*use|instructions?)\\b"
      ],
      keywords: [
        "ช่วย",
        "มีอะไรบ้าง",
        "help",
        "ทำอะไรได้",
        "feature"
      ],
      responseHint: { thai: "แสดงรายการบริการและคำถามที่พบบ่อย", english: "Show FAQ and service list" },
      exclusionPatterns: [
      ],
      confidenceBoost: 0.15
    },
    factory_solar: {
      priority: 72,
      patterns: [
        "\\b(?:factory\\s*solar|solar\\s*for\\s*factory|factory\\s*rooftop)\\b",
        "\\b(?:industrial\\s*solar|manufacturing\\s*solar|factory\\s*energy)\\b",
        "โรงงาน",
        "อุตสาหกรรม",
        "\\b(?:production\\s*line|factory\\s*production|manufacturing\\s*plant)\\b",
        "กำลังการผลิต",
        "โรงงานอุตสาหกรรม",
        "ภาคอุตสาหกรรม",
        "\\b(?:plant\\s*installation|factory\\s*roof|industrial\\s*rooftop)\\b",
        "โรงงานผลิต"
      ],
      keywords: [
        "โรงงาน",
        "อุตสาหกรรม",
        "กำลังการผลิต",
        "factory",
        "industrial"
      ],
      responseHint: { thai: "เสนอแบบจำลองโรงงานผลิตโซล่าเซล์", english: "Present factory solar solution" },
      exclusionPatterns: [
        "\\b(?:factory\\s*reset|factory\\s*default|factor)\\b"
      ],
      confidenceBoost: 0.3
    },
    gas_station_solar: {
      priority: 70,
      patterns: [
        "\\b(?:gas\\s*station\\s*solar|solar\\s*for\\s*gas\\s*station|petrol\\s*station\\s*solar)\\b",
        "\\b(?:fuel\\s*station|gasoline\\s*station|petrol\\s*station|service\\s*station)\\b",
        "ปั้มน้ำมัน",
        "ปตท",
        "\\b(?:shell\\s*station|caltex|esso|some\\s*charoen|bangchak)\\b",
        "บางจาก",
        "สถานีบริการน้ำมัน",
        "ปั้มน้ำมันเชื้อเพลิง",
        "\\b(?:gas\\s*station\\s*roof|station\\s*canopy|fuel\\s*station\\s*solar)\\b",
        "ปั้มน้ำมันโซล่าเซล์"
      ],
      keywords: [
        "ปั้มน้ำมัน",
        "gas station",
        "ปตท",
        "บางจาก",
        "สถานีบริการ"
      ],
      responseHint: { thai: "เสนอโซล่าเซล์สำหรับปั้มน้ำมัน", english: "Offer gas station solar solution" },
      exclusionPatterns: [
        "\\b(?:gas\\s*price|gas\\s*cooker|gas\\s*stove|gas\\s*leak)\\b"
      ],
      confidenceBoost: 0.35
    },
    mall_solar: {
      priority: 68,
      patterns: [
        "\\b(?:mall\\s*solar|shopping\\s*mall\\s*solar|solar\\s*for\\s*mall)\\b",
        "\\b(?:department\\s*store\\s*solar|retail\\s*solar|commercial\\s*building\\s*solar)\\b",
        "ห้าง",
        "ศูนย์การค้า",
        "\\b(?:retail\\s*space|shopping\\s*center|mall\\s*owner)\\b",
        "สนามการค้า",
        "โรงพาณิชย์",
        "อาคารพาณิชย์",
        "\\b(?:commercial\\s*property\\s*solar|retail\\s*chain\\s*solar|store\\s*rooftop)\\b",
        "เซ็นทรัลสายเพลง"
      ],
      keywords: [
        "ห้าง",
        "ศูนย์การค้า",
        "โรงพาณิชย์",
        "mall",
        "shopping"
      ],
      responseHint: { thai: "เสนอโซล่าเซล์สำหรับห้างและศูนย์การค้า", english: "Offer mall/commercial solar solution" },
      exclusionPatterns: [
      ],
      confidenceBoost: 0.3
    },
    hotel_solar: {
      priority: 66,
      patterns: [
        "\\b(?:hotel\\s*solar|solar\\s*for\\s*hotel|hotel\\s*energy\\s*saving)\\b",
        "\\b(?:resort\\s*solar|hospitality\\s*solar|hotel\\s*rooftop)\\b",
        "โรงแรม",
        "รีสอร์ท",
        "\\b(?:guesthouse\\s*solar|hostel\\s*solar|inn\\s*solar)\\b",
        "ไรส์อร์ท",
        "โรงแรมรีสอร์ท",
        "ที่พักแรม",
        "\\b(?:bungalow\\s*solar|villa\\s*solar|hotel\\s*chain\\s*solar)\\b",
        "โรงแรมอุตสาหกรรม"
      ],
      keywords: [
        "โรงแรม",
        "รีสอร์ท",
        "ไรส์อร์ท",
        "hotel",
        "resort"
      ],
      responseHint: { thai: "เสนอโซล่าเซล์สำหรับโรงแรมและรีสอร์ท", english: "Offer hotel/resort solar solution" },
      exclusionPatterns: [
        "\\b(?:hotel\\s*california|hotel\\s*room\\s*service|hotel\\s*booking)\\b"
      ],
      confidenceBoost: 0.3
    },
    rooftop_solar: {
      priority: 65,
      patterns: [
        "\\b(?:rooftop\\s*solar|solar\\s*rooftop|roof\\s*solar|solar\\s*roof)\\b",
        "\\b(?:roof\\s*installation|solar\\s*panel\\s*roof|roof\\s*mount)\\b",
        "หลังคา",
        "หลังคาโซล่าเซล์",
        "\\b(?:rooftop\\s*installation|install\\s*rooftop|flat\\s*roof\\s*solar)\\b",
        "ดาดฟ้าโซล่าเซล์",
        "หลังคาอาคาร",
        "บนหลังคา",
        "\\b(?:roof\\s*area|roof\\s*space|roof\\s*design\\s*solar)\\b",
        "ติดแผงบนหลังคา"
      ],
      keywords: [
        "หลังคา",
        "rooftop",
        "หลังคาโซล่าเซล์",
        "ดาดฟ้า",
        "solar roof"
      ],
      responseHint: { thai: "เสนอข้อมูลโซล่าเซล์บนหลังคา", english: "Present rooftop solar solution" },
      exclusionPatterns: [
        "\\b(?:rooftop\\s*bar|rooftop\\s*pool|rooftop\\s*restaurant|roof\\s*rain)\\b"
      ],
      confidenceBoost: 0.25
    }
  },

  classify: function (text) {
    if (!text || typeof text !== "string") {
      return { intent: "unknown", confidence: 0, matchedPatterns: [] };
    }
    var input = text.trim();
    var results = [];
    var patternKeys = Object.keys(this.patterns);
    for (var i = 0; i < patternKeys.length; i++) {
      var intentName = patternKeys[i];
      var intent = this.patterns[intentName];
      var matchedPatterns = [];
      for (var j = 0; j < intent.patterns.length; j++) {
        try {
          if (new RegExp(intent.patterns[j], "gi").test(input)) {
            matchedPatterns.push(intent.patterns[j]);
          }
        } catch (e) {}
      }
      if (matchedPatterns.length === 0) {
        var found = false;
        for (var k = 0; k < intent.keywords.length; k++) {
          if (input.toLowerCase().indexOf(intent.keywords[k].toLowerCase()) !== -1) {
            found = true;
            break;
          }
        }
        if (!found) continue;
      }
      var excluded = false;
      for (var ex = 0; ex < intent.exclusionPatterns.length; ex++) {
        try {
          if (new RegExp(intent.exclusionPatterns[ex], "gi").test(input)) {
            excluded = true;
            break;
          }
        } catch (e) {}
      }
      if (excluded) continue;
      var confidence = 0.3;
      if (matchedPatterns.length > 0) {
        confidence += Math.min(0.5, matchedPatterns.length * intent.confidenceBoost);
      }
      results.push({
        intent: intentName,
        confidence: Math.min(1.0, confidence),
        matchedPatterns: matchedPatterns,
        priority: intent.priority
      });
    }
    if (results.length === 0) {
      return { intent: "unknown", confidence: 0, matchedPatterns: [] };
    }
    results.sort(function(a,b){
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.priority - a.priority;
    });
    return {
      intent: results[0].intent,
      confidence: results[0].confidence,
      matchedPatterns: results[0].matchedPatterns
    };
  }
};
export interface CompetitorProfile {
  id: string;
  name: string;
  marketPosition: string;
  observedOfferings: string[];
  strengths: string[];
  gapsToExploit: string[];
  sourceUrl: string;
}

export interface CompetitorIntelligence {
  generatedAt: string;
  marketPatterns: string[];
  competitors: CompetitorProfile[];
  strategicPositioning: string[];
  quotationImplications: string[];
}

export function buildCompetitorIntelligence(): CompetitorIntelligence {
  return {
    generatedAt: new Date().toISOString(),
    marketPatterns: [
      "C&I buyers see strong PPA and zero-CAPEX offers, so a CAPEX quotation must justify ownership, control, resilience, and lifecycle value.",
      "Established EPC players emphasize permit handling, authority submission, after-sales service, monitoring, and O&M.",
      "BESS is appearing as an add-on to solar PPA and energy-efficiency offers, but detailed critical-load engineering and commissioning evidence are not usually surfaced in sales material.",
      "A differentiated proposal should show load-by-time analysis, critical-load boundary, STS continuity, EMS logic, anti-export control, commissioning evidence, and O&M plan."
    ],
    competitors: [
      {
        id: "greenyellow-thailand",
        name: "GreenYellow Thailand",
        marketPosition: "Solar PPA / energy efficiency / BESS provider with no-investment positioning.",
        observedOfferings: ["Solar PPA", "energy efficiency", "BESS", "O&M", "advanced monitoring"],
        strengths: ["Financed PPA model", "industrial customer focus", "in-house monitoring", "strong savings narrative"],
        gapsToExploit: [
          "CAPEX ownership model can appeal where customer wants asset control.",
          "Critical-load STS and island-mode engineering can be shown more explicitly.",
          "Detailed appliance/load profile and commissioning evidence can differentiate technical proposals."
        ],
        sourceUrl: "https://www.greenyellow.co.th/en/solar-ppa/"
      },
      {
        id: "groof-gunkul",
        name: "GRoof / Gunkul Engineering",
        marketPosition: "Large Thai solar rooftop provider with residential and business reach plus Private PPA.",
        observedOfferings: ["EPC", "Private PPA", "solar app", "after-sales", "permit/license service"],
        strengths: ["Known parent company", "large installed base claims", "nationwide service message", "permit handling"],
        gapsToExploit: [
          "C&I BESS + STS critical-load engineering can be a higher-value niche.",
          "Detailed EMS/SCADA and failure-mode knowledge can out-position generic rooftop packages."
        ],
        sourceUrl: "https://www.gunkul.com/en/businesses/energy-business/groof-residential-solar-rooftop"
      },
      {
        id: "pstc-ok-solar",
        name: "OK Solar by PSTC",
        marketPosition: "Renewable investor/EPC offering design, permit, O&M, monitoring, and commercial/factory EPC.",
        observedOfferings: ["design and survey", "permit application", "O&M", "monitoring", "Private PPA", "battery"],
        strengths: ["PEA/MEA permit handling", "factory/commercial EPC", "investor credibility"],
        gapsToExploit: [
          "Proposal can beat generic service lists by showing reproducible engineering calculations.",
          "Quote should include commissioning checklist and measurable acceptance criteria."
        ],
        sourceUrl: "https://oksolar.pst.co.th/en/"
      },
      {
        id: "rezeca",
        name: "ReZeca Engineering",
        marketPosition: "Commercial/industrial rooftop EPC with turnkey EPC, O&M, and Private PPA.",
        observedOfferings: ["turnkey EPC", "PEA/MEA submission", "testing and commissioning", "O&M", "Private PPA"],
        strengths: ["C&I rooftop focus", "Singapore/Thailand project references", "authority submission workflow"],
        gapsToExploit: [
          "Hybrid BESS and critical-load uptime economics can be positioned beyond grid-tied rooftop.",
          "Detailed usage profile and BESS dispatch model create a stronger consultative sale."
        ],
        sourceUrl: "https://www.rezeca.co.th/th/"
      },
      {
        id: "grpo",
        name: "GRPO",
        marketPosition: "Specialist O&M / asset management provider for solar and BESS assets.",
        observedOfferings: ["solar farm O&M", "solar rooftop/floating O&M", "BESS O&M", "asset management"],
        strengths: ["O&M specialization", "portfolio capacity claims", "BESS O&M experience"],
        gapsToExploit: [
          "Include post-commissioning O&M and SCADA deliverables in quote.",
          "Offer knowledge-base handoff and RCA workflow as differentiator."
        ],
        sourceUrl: "https://www.grpo.co.th/"
      },
      {
        id: "mnec",
        name: "MONO Energy Construction",
        marketPosition: "Integrated solar EPCC provider for industrial, commercial, and residential sectors.",
        observedOfferings: ["EPCC", "ESS", "EMS", "EV charging", "O&M", "consulting/development"],
        strengths: ["One-stop solution", "standards/safety message", "ESS and EMS listed in solutions"],
        gapsToExploit: [
          "Use quantified critical-load, STS, and commissioning workflow to avoid sounding like a generic one-stop provider.",
          "Tie quote to time-of-use/load-profile intelligence and ObsidianBrain project memory."
        ],
        sourceUrl: "https://www.mnec.co.th/en"
      },
      {
        id: "secusolar",
        name: "SecuSolar",
        marketPosition: "Engineering-led C&I solar EPC and O&M positioning focused on realistic savings and documentation.",
        observedOfferings: ["solar/hybrid systems", "rooftop/ground-mount", "O&M", "inspections", "performance monitoring"],
        strengths: ["Engineering-led narrative", "safety and documentation focus", "transparent performance messaging"],
        gapsToExploit: [
          "Match engineering credibility, then go further with BESS/STS/EMS intelligence.",
          "Show automated proposal, BOQ, load model, quote, and knowledge graph as proof of systemized delivery."
        ],
        sourceUrl: "https://secusolar.com/"
      }
    ],
    strategicPositioning: [
      "Position SIRINX Solar as an Energy Engineering Intelligence Platform, not a generic EPC.",
      "Lead with measured load profile, critical-load continuity, and financial explainability.",
      "Offer both CAPEX EPC and future PPA/BaaS comparison so customers can compare ownership vs no-investment models.",
      "Use ObsidianBrain project memory as a trust signal: every assumption, failure case, commissioning gate, and decision is traceable."
    ],
    quotationImplications: [
      "Every quotation should include assumptions, exclusions, validity, commissioning evidence, and optional O&M.",
      "Separate bill-savings value from resilience, backup continuity, and power-quality value.",
      "Include an alternate financing/PPA note when customer has CAPEX resistance.",
      "Attach a competitor-aware differentiator section: engineering-grade load model, C&I BESS/STS design, EMS logic, and knowledge handoff."
    ]
  };
}

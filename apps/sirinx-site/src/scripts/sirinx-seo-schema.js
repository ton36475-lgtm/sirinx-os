(function () {
  'use strict';

  if (typeof document === 'undefined') return;

  function schemaExists() {
    return document.querySelectorAll('script[type="application/ld+json"]').length > 0;
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function orgSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SIRINX',
      url: 'https://www.sirinx.co/',
      email: 'contact@sirinx.co',
      areaServed: { '@type': 'Country', name: 'Thailand' },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        availableLanguage: ['th', 'en'],
        url: 'https://lin.ee/S97R6nj'
      }
    };
  }

  function breadcrumbSchema(pathParts) {
    var items = [
      { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: 'https://www.sirinx.co/' }
    ];
    var accumulated = '';
    pathParts.forEach(function (part, i) {
      accumulated += '/' + part;
      items.push({
        '@type': 'ListItem',
        position: i + 2,
        name: part.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
        item: 'https://www.sirinx.co' + accumulated
      });
    });
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items,
      dateModified: today()
    };
  }

  function homeSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'SIRINX – Solar Carport & EV Charging Solutions',
      url: 'https://www.sirinx.co/',
      inLanguage: ['th', 'en'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://www.sirinx.co/search?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    };
  }

  function faqSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'รองรับพื้นที่จอดรถมากกว่า 50 คันได้หรือไม่? / Can your solar carport accommodate 50+ parking spots?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ได้ SIRINX ออกแบบและติดตั้งโครงสร้างหลังคาโซลาร์เซลล์สำหรับพื้นที่จอดรถขนาดใหญ่ตั้งแต่ 50 คันขึ้นไป รวมถึงระบบบริหารพลังงานอัจฉริยะ (AI EMS) ครบวงจร / Yes, SIRINX designs and installs solar carport structures for large parking areas from 50+ spots, including integrated AI Energy Management Systems.'
          }
        },
        {
          '@type': 'Question',
          name: 'รองรับหัวชาร์จ EV ยี่ห้อไหนได้บ้าง? / Which EV charger brands are compatible?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ระบบของ SIRINX รองรับหัวชาร์จ EV ทุกมาตรฐานทั้ง AC และ DC รวมถึงแบรนด์ชั้นนำเช่น EVBox, ChargePoint, ABB, Wallbox และอื่นๆ สามารถปรับแต่งตามความต้องการของโครงการ / SIRINX systems support all standard AC and DC EV chargers including leading brands such as EVBox, ChargePoint, ABB, Wallbox, and others — customizable per project requirements.'
          }
        },
        {
          '@type': 'Question',
          name: 'SIRINX รองรับการเชื่อมต่อกับระบบกักเก็บพลังงาน (BESS) หรือไม่? / Does SIRINX support Battery Energy Storage System (BESS) integration?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ใช่ SIRINX รองรับการเชื่อมต่อและบริหารจัดการ BESS ทุกขนาด ตั้งแต่ระดับบ้านจนถึงระดับอุตสาหกรรม ผสานร่วมกับระบบโซลาร์เซลล์และ AI EMS เพื่อเพิ่มประสิทธิภาพการใช้พลังงานสูงสุด / Yes, SIRINX supports full BESS integration from residential to industrial scale, combined with solar PV and AI EMS for maximum energy optimization.'
          }
        }
      ]
    };
  }

  function roilSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'SIRINX ROI Calculator',
      url: 'https://www.sirinx.co/roi-calculator',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'เครื่องมือคำนวณผลตอบแทนการลงทุนโซลาร์เซลล์และที่ชาร์จ EV สำหรับโครงการในประเทศไทย / Solar carport and EV charger ROI financial modeling tool for Thailand projects.',
      inLanguage: ['th', 'en'],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'THB'
      },
      potentialAction: {
        '@type': 'UseAction',
        target: 'https://www.sirinx.co/roi-calculator'
      }
    };
  }

  function projectsSchema() {
    var todayStr = today();
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'SIRINX Projects',
      description: 'โซลาร์ฟาร์มและระบบพลังงานอัจฉริยะโดย SIRINX / Solar farm and smart energy projects by SIRINX.',
      url: 'https://www.sirinx.co/projects',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          item: {
            '@type': 'Product',
            name: 'Solar Farm Node 1 — โรงแรมเรือนแพ รอยัลปาร์ค',
            description: 'ระบบโซลาร์เซลล์ร่วมกับแบตเตอรี่และ AI EMS สำหรับโรงแรมเรือนแพ รอยัลปาร์ค จังหวัดพิษณุโลก / Solar + BESS + AI EMS system for Ruean Phae Royal Park Hotel, Phitsanulok.',
            category: 'Solar Farm',
            location: { '@type': 'Place', name: 'Phitsanulok, Thailand' }
          }
        },
        {
          '@type': 'ListItem',
          position: 2,
          item: {
            '@type': 'Product',
            name: 'Solar Farm Node 2 — โรงแรมโฮลาเทลริมน่าน',
            description: 'ระบบโซลาร์เซลล์พร้อมแบตเตอรี่และระบบโรงแรมอัจฉริยะ สำหรับโรงแรมโฮลาเทลริมน่าน จังหวัดน่าน / Solar + BESS + Smart Hotel System for Holatel Rimnan Hotel, Nan.',
            category: 'Solar Farm',
            location: { '@type': 'Place', name: 'Nan, Thailand' }
          }
        }
      ],
      dateModified: todayStr
    };
  }

  function lineSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': ['ContactPage', 'Service'],
      name: 'SIRINX LINE Official Account',
      url: 'https://www.sirinx.co/line',
      description: 'ติดต่อ SIRINX ผ่าน LINE สำหรับสอบถามข้อมูลโซลาร์เซลล์ ที่ชาร์จ EV และระบบ BESS / Contact SIRINX via LINE for solar, EV charger, and BESS inquiries.',
      inLanguage: ['th', 'en'],
      provider: {
        '@type': 'Organization',
        '@id': 'https://www.sirinx.co/#organization',
        name: 'SIRINX',
        url: 'https://www.sirinx.co/'
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        url: 'https://lin.ee/S97R6nj',
        availableLanguage: ['th', 'en']
      }
    };
  }

  function contactSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'ติดต่อ SIRINX / Contact SIRINX',
      url: 'https://www.sirinx.co/contact',
      inLanguage: ['th', 'en'],
      mainEntity: {
        '@type': 'Organization',
        '@id': 'https://www.sirinx.co/#organization',
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'sales',
            email: 'contact@sirinx.co',
            url: 'https://lin.ee/S97R6nj',
            availableLanguage: ['th', 'en']
          }
        ]
      }
    };
  }

  function trustSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'SIRINX Trust Center / ศูนย์ความน่าเชื่อถือ',
      url: 'https://www.sirinx.co/trust-center',
      inLanguage: ['th', 'en'],
      mainEntity: {
        '@type': 'Organization',
        '@id': 'https://www.sirinx.co/#organization',
        description: 'SIRINX ยึดมั่นในหลักธรรมาภิบาล ความโปร่งใส และความปลอดภัยของข้อมูลลูกค้า / SIRINX is committed to governance, transparency, and data security.',
        knowsAbout: [
          'Data Privacy / ความเป็นส่วนตัวของข้อมูล',
          'Security Compliance / การปฏิบัติตามมาตรฐานความปลอดภัย',
          'Service Level Agreements / ข้อตกลงระดับบริการ',
          'Environmental Governance / ธรรมาภิบาลสิ่งแวดล้อม'
        ]
      },
      dateModified: today()
    };
  }

  function defaultSchema(pathname) {
    var parts = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
    return [orgSchema(), breadcrumbSchema(parts)];
  }

  function getSchemasForPath(pathname) {
    var schemas = [orgSchema()];

    switch (pathname) {
      case '/':
      case '':
        schemas.push(homeSchema());
        schemas.push(faqSchema());
        break;
      case '/roi-calculator':
        schemas.push(roilSchema());
        break;
      case '/projects':
        schemas.push(projectsSchema());
        break;
      case '/line':
        schemas.push(lineSchema());
        break;
      case '/contact':
        schemas.push(contactSchema());
        break;
      case '/trust-center':
        schemas.push(trustSchema());
        break;
      default:
        schemas = defaultSchema(pathname);
        break;
    }

    return schemas;
  }

  function run() {
    if (schemaExists()) return;

    var path = window.location.pathname;
    var schemas = getSchemasForPath(path);

    schemas.forEach(function (obj) {
      var script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(obj, null, 2);
      document.head.appendChild(script);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();

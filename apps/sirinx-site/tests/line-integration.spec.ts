import { test, expect } from '@playwright/test';

test.describe('SIRINX Website - LINE Integration UAT', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  const liveHomeOgImage =
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663541525436/DfaBNh7LYBahFVi2JKfAUv/sirinx-og-image-hbNko5JADXArPGo26hmGrN.png';
  const seoRoutes = [
    {
      route: '/',
      canonical: 'https://www.sirinx.co/',
      image: liveHomeOgImage
    },
    {
      route: '/line',
      canonical: 'https://www.sirinx.co/line',
      image: 'https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr',
      breadcrumbName: 'LINE Official',
      faqPage: true
    },
    {
      route: '/contact',
      canonical: 'https://www.sirinx.co/contact',
      image: 'https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr',
      breadcrumbName: 'ติดต่อ'
    },
    {
      route: '/projects',
      canonical: 'https://www.sirinx.co/projects',
      image: 'https://www.sirinx.co/assets/optimized/solar-carport-hero-1280.jpg',
      breadcrumbName: 'ผลงาน'
    },
    {
      route: '/trust-center',
      canonical: 'https://www.sirinx.co/trust-center',
      image: 'https://www.sirinx.co/assets/optimized/solar-carport-hero-1280.jpg',
      breadcrumbName: 'Trust Center'
    },
    {
      route: '/quote',
      canonical: 'https://www.sirinx.co/quote',
      image: 'https://www.sirinx.co/assets/optimized/solar-carport-hero-1280.jpg',
      breadcrumbName: 'ขอใบเสนอราคา'
    },
    {
      route: '/roi-calculator',
      canonical: 'https://www.sirinx.co/roi-calculator',
      image: 'https://www.sirinx.co/assets/optimized/solar-carport-hero-1280.jpg',
      breadcrumbName: 'ROI'
    }
  ];
  const activeNavRoutes = [
    { route: '/line', href: '/line' },
    { route: '/contact', href: '/contact' },
    { route: '/projects', href: '/projects' },
    { route: '/trust-center', href: '/trust-center' },
    { route: '/quote', href: '/quote' },
    { route: '/roi-calculator', href: '/roi-calculator' }
  ];
  const homepageAlignedNavLabels = ['ผลงาน', 'Trust', 'Quote', 'ROI', 'ติดต่อ', 'LINE'];
  const mobileCurrentNavLabels = new Map([
    ['/line', 'LINE'],
    ['/contact', 'ติดต่อ'],
    ['/projects', 'ผลงาน'],
    ['/trust-center', 'Trust'],
    ['/quote', 'Quote'],
    ['/roi-calculator', 'ROI']
  ]);

  test('Homepage loads and displays correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/SIRINX/);
    await expect(page.locator('h1')).toContainText('เปลี่ยนที่จอดรถ');
    await expect(page.getByRole('heading', { name: 'เป็นโรงไฟฟ้าพลังงานแสงอาทิตย์' })).toBeVisible();
    await expect(page.getByText('ผลิตไฟฟ้า ให้ร่มเงา รองรับ EV Charger')).toBeVisible();
  });

  for (const { route, canonical, image, breadcrumbName, faqPage } of seoRoutes) {
    test(`${route} includes canonical SEO/AEO metadata`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', image);
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', image);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a1628');
      await expect(page.locator('script[type="application/ld\\+json"]').first()).toBeAttached();

      if (breadcrumbName) {
        const jsonLdScripts = await page
          .locator('script[type="application/ld\\+json"]')
          .evaluateAll((scripts) => scripts.map((script) => script.textContent || ''));
        expect(
          jsonLdScripts.some(
            (script) =>
              script.includes('"@type": "BreadcrumbList"') &&
              script.includes('"name": "หน้าแรก"') &&
              script.includes('"item": "https://www.sirinx.co/"') &&
              script.includes(`"name": "${breadcrumbName}"`) &&
              script.includes(`"item": "${canonical}"`)
          )
        ).toBe(true);

        if (faqPage) {
          expect(
            jsonLdScripts.some(
              (script) =>
                script.includes('"@type": "FAQPage"') &&
                script.includes('"name": "ต้องเตรียมข้อมูลอะไรบ้าง"') &&
                script.includes('"name": "ประเมินเบื้องต้นฟรีไหม"') &&
                script.includes('"name": "ใช้เวลาประเมินกี่วัน"') &&
                script.includes('"name": "ถ้าไม่มีบิลค่าไฟทำได้ไหม"') &&
                script.includes('"name": "ส่งรูปพื้นที่แทนได้ไหม"')
            )
          ).toBe(true);
        }
      }
    });
  }

  for (const { route, href } of activeNavRoutes) {
    test(`${route} marks the current navigation item`, async ({ page }) => {
      await page.goto(route);
      const currentLink = page.locator(`nav a[href="${href}"]`);
      await expect(currentLink).toHaveAttribute('aria-current', 'page');
    });
  }

  for (const { route } of activeNavRoutes) {
    test(`${route} uses homepage-aligned navigation labels`, async ({ page }) => {
      await page.goto(route);
      const navLabels = await page.locator('.nav-links a').evaluateAll((links) =>
        links.map((link) => (link.textContent || '').trim())
      );

      expect(navLabels).toEqual(homepageAlignedNavLabels);
      expect(navLabels).not.toContain('หน้าแรก');
      expect(navLabels).not.toContain('ความสามารถ');
      expect(navLabels).not.toContain('ขอใบเสนอราคา');
      expect(navLabels).not.toContain('Trust Center');
      expect(navLabels).not.toContain('LINE Official');
    });
  }

  for (const { route } of activeNavRoutes) {
    test(`${route} uses the homepage header and footer treatment`, async ({ page }) => {
      await page.goto(route);

      await expect(page.locator('header.production-header')).toBeVisible();
      await expect(page.locator('.production-brand-mark')).toHaveText('SIRINX');
      await expect(page.locator('.brand-mark')).toHaveCount(0);
      await expect(page.getByText('solar + AI energy')).toHaveCount(0);
      await expect(page.locator('footer.production-footer')).toBeVisible();
      await expect(page.locator('footer.production-footer')).toContainText(
        'SIRINX Solar Carport, EV Charger, BESS & AI Energy'
      );
    });
  }

  for (const { route } of activeNavRoutes) {
    test(`${route} mobile navigation shows the current page and LINE`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);

      const visibleNavLabels = await page.locator('.nav-links a').evaluateAll((links) =>
        links
          .filter((link) => window.getComputedStyle(link).display !== 'none')
          .map((link) => (link.textContent || '').trim())
      );

      expect(visibleNavLabels).toContain(mobileCurrentNavLabels.get(route));
      expect(visibleNavLabels).toContain('LINE');
      expect(visibleNavLabels.length).toBeLessThanOrEqual(route === '/line' ? 1 : 2);
    });
  }

  test('LINE CTA exists in navigation', async ({ page }) => {
    await expect(page.locator('nav a[href="/line"]')).toBeVisible();
  });

  test('LINE CTA button in hero section', async ({ page }) => {
    const lineCta = page.locator('.production-line-link');
    await expect(lineCta).toBeVisible();
    await lineCta.click();
    await expect(page).toHaveURL(/\/line/);
  });

  test('homepage primary CTA follows the live index contact route', async ({ page }) => {
    await page.getByRole('link', { name: 'ขอใบเสนอราคา Solar Carport' }).first().click();
    await expect(page).toHaveURL(/\/contact\?interest=solar-carport/);
    await expect(page.getByRole('heading', { name: 'คุยกับทีม SIRINX เพื่อประเมินระบบพลังงานองค์กร' })).toBeVisible();
  });

  test('/line page exists and is responsive', async ({ page }) => {
    await page.goto('/line');
    await expect(page.locator('h1')).toBeVisible();
    const qr = page.locator('.line-main-card img[alt*="QR Code"]');
    await expect(qr).toBeVisible();
    await expect(qr).toHaveAttribute('width', '320');
    await expect(qr).toHaveAttribute('height', '320');
    await expect(qr).toHaveAttribute('fetchpriority', 'high');
    await expect(qr).toHaveAttribute('data-qr-image', '');
    await expect(page.locator('.line-main-card .qr-fallback')).toBeHidden();
  });

  test('/line page keeps the mobile QR unobstructed', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/line');
    await expect(page.locator('#contact-trigger-mobile')).toBeHidden();
    await expect(page.locator('.line-main-card .qr-large')).toBeVisible();
  });

  test('/line page shows fallback copy if QR image fails', async ({ page }) => {
    await page.goto('/line');
    const qr = page.locator('.line-main-card .qr-large');
    const fallback = page.locator('.line-main-card .qr-fallback');

    await expect(fallback).toBeHidden();
    await qr.evaluate((image) => {
      image.classList.add('qr-error');
      image.setAttribute('data-qr-status', 'error');
    });

    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText('QR ไม่แสดง');
  });

  test('/line page includes safe metadata and structured contact context', async ({ page }) => {
    await page.goto('/line');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.sirinx.co/line');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /LINE Official/);
    await expect(page.locator('script[type="application/ld\\+json"]')).toHaveCount(3);
  });

  test('/line page includes required quick actions, trust links, FAQ, and final CTA', async ({ page }) => {
    await page.goto('/line');

    await expect(page.locator('.quick-action-card')).toHaveCount(5);
    await expect(page.getByRole('link', { name: 'ส่งบิลค่าไฟให้ทีมประเมิน' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ประเมิน Solar Carport สำหรับองค์กร' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ประเมิน Rooftop Solar สำหรับอาคาร' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'วางแผน EV Charger / BESS' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'นัดสำรวจหน้างาน' })).toBeVisible();

    await expect(page.locator('.trust-link-card')).toHaveCount(5);
    await expect(page.locator('.trust-link-card').filter({ hasText: 'เว็บไซต์บริษัท' })).toHaveCount(1);
    await expect(page.locator('.trust-link-card').filter({ hasText: 'บริการหลัก' })).toHaveCount(1);
    await expect(page.locator('.trust-link-card').filter({ hasText: 'ช่องทางติดต่อ' })).toHaveCount(1);
    await expect(page.locator('.trust-link-card').filter({ hasText: 'ทีมประเมินระบบ' })).toHaveCount(1);

    await expect(page.locator('.faq-list details')).toHaveCount(5);
    await expect(page.locator('text=ต้องเตรียมข้อมูลอะไรบ้าง')).toBeVisible();
    await expect(page.locator('text=ประเมินเบื้องต้นฟรีไหม')).toBeVisible();
    await expect(page.locator('text=ถ้าไม่มีบิลค่าไฟทำได้ไหม')).toBeVisible();

    await expect(page.locator('.line-final-cta a[href="https://lin.ee/S97R6nj"]')).toBeVisible();
    await expect(page.locator('.line-final-cta a[href="https://lin.ee/S97R6nj"]')).toHaveAttribute(
      'data-track-events',
      /line_add_friend_click/
    );
    await expect(page.locator('.line-final-cta a[href="/quote"]')).toBeVisible();
    await expect(page.locator('.line-final-cta a[href="/quote"]')).toHaveAttribute('data-track-event', 'quote_cta_click');
    await expect(page.locator('text=ดูผลงาน')).toBeVisible();
  });

  test('/contact page includes LINE, email, prep checklist, and no web form storage path', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.sirinx.co/contact');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /ติดต่อ SIRINX/);
    await expect(page.locator('script[type="application/ld\\+json"]')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'คุยกับทีม SIRINX เพื่อประเมินระบบพลังงานองค์กร' })).toBeVisible();
    const qr = page.locator('.line-contact-card img[alt="QR Code สำหรับเพิ่มเพื่อน LINE Official ของ SIRINX"]');
    await expect(qr).toBeVisible();
    await expect(qr).toHaveAttribute('width', '320');
    await expect(qr).toHaveAttribute('height', '320');
    await expect(qr).toHaveAttribute('fetchpriority', 'high');
    await expect(qr).toHaveAttribute('data-qr-image', '');
    await expect(page.locator('.line-contact-card .qr-fallback')).toBeHidden();
    await expect(page.getByRole('link', { name: 'เพิ่มเพื่อน LINE Official' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'เพิ่มเพื่อน LINE Official' })).toHaveAttribute(
      'data-track-events',
      /line_add_friend_click/
    );
    await expect(page.getByRole('link', { name: 'แชทกับทีม' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'แชทกับทีม' })).toHaveAttribute('data-track-event', 'line_chat_click');
    await expect(page.getByRole('link', { name: 'ส่งอีเมล' })).toBeVisible();
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.locator('text=LINE Official เหมาะสำหรับส่งบิลค่าไฟ')).toBeVisible();
    await expect(page.locator('text=เริ่มจากข้อมูลจริง ก่อนตัดสินใจลงทุน')).toBeVisible();
    await expect(page.getByText('บิลค่าไฟล่าสุด', { exact: true })).toBeVisible();
    await expect(page.locator('text=รูปหลังคาหรือพื้นที่ติดตั้ง')).toBeVisible();
  });

  test('/trust-center page documents trust gates without live integrations', async ({ page }) => {
    await page.goto('/trust-center');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.sirinx.co/trust-center');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Trust Center/);
    await expect(page.locator('script[type="application/ld\\+json"]')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Trust Center ของ SIRINX สำหรับงาน Solar และ AI Energy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'หลักฐานก่อนคำกล่าวอ้าง' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'อนุมัติก่อนระบบอัตโนมัติ' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ขอบเขตข้อมูลลูกค้า' })).toBeVisible();
    await expect(page.locator('text=การเปิดใช้ LINE webhook')).toBeVisible();
    await expect(page.locator('text=CRM และที่เก็บข้อมูลลูกค้า')).toBeVisible();
    await expect(page.getByRole('link', { name: 'เพิ่มเพื่อน LINE Official' })).toBeVisible();
  });

  test('/projects page shows project-proof policy without fabricated case studies', async ({ page }) => {
    await page.goto('/projects');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.sirinx.co/projects');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /ผลงาน SIRINX และมาตรฐานหลักฐาน/);
    await expect(page.locator('script[type="application/ld\\+json"]')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'ผลงาน SIRINX และมาตรฐานหลักฐานโครงการ' })).toBeVisible();
    await expect(page.locator('text=ไม่ใช้รูปหน้างาน')).toBeVisible();
    await expect(page.getByText('สิทธิ์เผยแพร่จากลูกค้า', { exact: true })).toBeVisible();
    await expect(page.getByText('ขอบเขตทางเทคนิค', { exact: true })).toBeVisible();
    await expect(page.getByText('ตรวจสอบรูปและสื่อ', { exact: true })).toBeVisible();
    await expect(page.getByText('ภาษาที่ไม่กล่าวอ้างเกินจริง', { exact: true })).toBeVisible();
    await expect(page.locator('.proof-category-grid').getByText('Solar Carport', { exact: true })).toBeVisible();
    await expect(page.locator('.proof-category-grid').getByText('AI Energy Management', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'เพิ่มเพื่อน LINE Official' })).toBeVisible();
  });

  test('/quote page prepares quote flow without collecting customer data', async ({ page }) => {
    await page.goto('/quote');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.sirinx.co/quote');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /ขอประเมินโครงการ/);
    await expect(page.locator('script[type="application/ld\\+json"]')).toHaveCount(2);
    await expect(
      page.getByRole('heading', { name: 'เตรียมข้อมูลขอประเมิน Solar Carport และ Rooftop Solar กับ SIRINX' })
    ).toBeVisible();
    await expect(page.locator('text=เช็กลิสต์บนหน้านี้ช่วยให้เตรียมข้อมูล')).toBeVisible();
    await expect(page.getByText('CRM และที่เก็บข้อมูลลูกค้า', { exact: true })).toBeVisible();
    await expect(page.locator('text=ยังไม่รับข้อมูลลูกค้าผ่านเว็บ')).toBeVisible();
    await expect(page.getByText('บิลค่าไฟล่าสุด', { exact: true })).toBeVisible();
    await expect(page.getByText('LINE webhook', { exact: true })).toBeVisible();
    await expect(page.getByText('analytics บนระบบจริง', { exact: true })).toBeVisible();
    const crmReadiness = page.locator('[data-crm-handoff-readiness]');
    await expect(crmReadiness).toBeVisible();
    await expect(crmReadiness).toHaveAttribute('data-gate-state', 'closed');
    await expect(crmReadiness.getByRole('heading', { name: 'เส้นทางรับ lead เข้า CRM ที่ยังปิดไว้' })).toBeVisible();
    await expect(crmReadiness.getByText('ขอความยินยอมก่อนจัดเก็บ', { exact: true })).toBeVisible();
    await expect(crmReadiness.getByText('ยังไม่เชื่อมฐานข้อมูลจริง', { exact: true })).toBeVisible();
    await expect(crmReadiness.locator('input, textarea, select, button')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'เพิ่มเพื่อน LINE Official' })).toBeVisible();
  });

  test('/quote page has no-storage readiness validator', async ({ page }) => {
    await page.goto('/quote');

    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'ตรวจความพร้อมของข้อมูลโครงการก่อนส่ง LINE' })).toBeVisible();
    await expect(page.locator('text=ไม่มีการส่งข้อมูล ไม่มีการบันทึกลงเบราว์เซอร์')).toBeVisible();
    await expect(page.locator('[data-readiness-status]')).toContainText('(0/5)');
    const initialStorage = await page.evaluate(() => ({
      localStorage: window.localStorage.length,
      sessionStorage: window.sessionStorage.length
    }));

    await page.getByLabel('มีบิลค่าไฟล่าสุด').check();
    await expect(page.locator('[data-readiness-status]')).toContainText('(1/5)');

    await page.getByLabel('มีรูปพื้นที่ติดตั้ง').check();
    await page.getByLabel('ทราบจังหวัดหรือพื้นที่หน้างาน').check();
    await page.getByLabel('เลือกประเภทระบบที่สนใจแล้ว').check();
    await page.getByLabel('มีช่วงเวลาที่สะดวกให้ติดต่อกลับ').check();
    await expect(page.locator('[data-readiness-status]')).toContainText('พร้อมส่งข้อมูลเบื้องต้นผ่าน LINE Official');
    const finalStorage = await page.evaluate(() => ({
      localStorage: window.localStorage.length,
      sessionStorage: window.sessionStorage.length
    }));
    expect(finalStorage).toEqual(initialStorage);
  });

  test('/roi-calculator page prepares ROI inputs without guaranteed savings claims', async ({ page }) => {
    await page.goto('/roi-calculator');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.sirinx.co/roi-calculator');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /เตรียมประเมิน ROI โซลาร์/);
    await expect(page.locator('script[type="application/ld\\+json"]')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'เตรียมประเมิน ROI โซลาร์สำหรับองค์กร' })).toBeVisible();
    await expect(page.locator('text=เตรียมบิลค่าไฟ พื้นที่ติดตั้ง')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ช่วงค่าไฟรายเดือน' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'การใช้ไฟช่วงกลางวัน' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'คำนวณกรอบ ROI เบื้องต้นในเบราว์เซอร์' })).toBeVisible();
    await expect(page.locator('text=ผลลัพธ์เป็นช่วงประมาณการ')).toBeVisible();
    await expect(page.getByText('คำนวณเป็นกรอบประมาณการเท่านั้น', { exact: true })).toBeVisible();
    await expect(page.getByText('ไม่รับประกันผลประหยัดจากหน้าเว็บ', { exact: true })).toBeVisible();
    await expect(page.getByText('ยังไม่มี CRM หรือที่เก็บข้อมูลลูกค้า', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'เพิ่มเพื่อน LINE Official' })).toBeVisible();
  });

  test('/roi-calculator page estimates locally without storage or network submission', async ({ page }) => {
    await page.goto('/roi-calculator');

    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.locator('[data-roi-calculator]')).toBeVisible();
    await expect(page.locator('[data-roi-size-output]')).toContainText('kWp');
    await expect(page.locator('[data-roi-saving-output]')).toContainText('บาท/เดือน');
    await expect(page.locator('[data-roi-payback-output]')).toContainText('ปี โดยประมาณ');
    const initialStorage = await page.evaluate(() => ({
      localStorage: window.localStorage.length,
      sessionStorage: window.sessionStorage.length
    }));

    await page.locator('[data-roi-input="monthlyBill"]').fill('180000');
    await page.locator('[data-roi-input="area"]').fill('520');
    await page.locator('[data-roi-input="daytimeUse"]').selectOption('0.8');
    await page.locator('[data-roi-input="electricityRate"]').fill('4.7');
    await expect(page.locator('[data-roi-size-output]')).toContainText('kWp');
    await expect(page.locator('[data-roi-saving-output]')).toContainText('บาท/เดือน');
    await expect(page.locator('[data-roi-disclaimer-output]')).toContainText('ต้องตรวจบิลจริง');
    const finalStorageAfterEstimate = await page.evaluate(() => ({
      localStorage: window.localStorage.length,
      sessionStorage: window.sessionStorage.length
    }));
    expect(finalStorageAfterEstimate).toEqual(initialStorage);
  });

  test('/roi-calculator page keeps the no-storage readiness validator', async ({ page }) => {
    await page.goto('/roi-calculator');

    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'ตรวจความพร้อมข้อมูลสำหรับช่วง ROI' })).toBeVisible();
    await expect(page.locator('.readiness-validator').getByText('การคำนวณข้างต้นเป็นกรอบประมาณการ')).toBeVisible();
    await expect(page.locator('[data-readiness-status]')).toContainText('(0/4)');
    const initialStorage = await page.evaluate(() => ({
      localStorage: window.localStorage.length,
      sessionStorage: window.sessionStorage.length
    }));

    await page.getByLabel('มีช่วงบิลค่าไฟรายเดือน').check();
    await expect(page.locator('[data-readiness-status]')).toContainText('(1/4)');

    await page.getByLabel('ทราบการใช้ไฟช่วงกลางวัน').check();
    await page.getByLabel('มีขนาดพื้นที่ติดตั้งโดยประมาณ').check();
    await page.getByLabel('ระบุความสนใจ BESS หรือ EV Charger แล้ว').check();
    await expect(page.locator('[data-readiness-status]')).toContainText('พร้อมให้ทีมประเมินช่วง ROI เบื้องต้นผ่าน LINE');
    const finalStorage = await page.evaluate(() => ({
      localStorage: window.localStorage.length,
      sessionStorage: window.sessionStorage.length
    }));
    expect(finalStorage).toEqual(initialStorage);
  });

  test('footer contains LINE Official CTA', async ({ page }) => {
    await expect(page.locator('footer a[href="/line"]')).toBeVisible();
  });

  test('FloatingContactCluster renders on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    const cluster = page.locator('#floating-contact-cluster');
    await expect(cluster).toBeVisible();
    const lineButton = page.locator('.line-button');
    await expect(lineButton).toBeVisible();
  });

  test('desktop LINE panel expands with QR, add friend, and chat links', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    const lineButton = page.locator('.line-button');
    await expect(lineButton).toHaveAttribute('aria-expanded', 'false');
    await page.locator('.line-button').click();
    await expect(lineButton).toHaveAttribute('aria-expanded', 'true');

    const panel = page.locator('#line-panel');
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    const qr = panel.locator('img[alt="QR Code สำหรับเพิ่มเพื่อน LINE Official ของ SIRINX"]');
    await expect(qr).toBeVisible();
    await expect(qr).toHaveAttribute('width', '240');
    await expect(qr).toHaveAttribute('height', '240');
    await expect(panel.locator('a[href="https://lin.ee/S97R6nj"]')).toBeVisible();
    await expect(panel.locator('a[href="https://lin.ee/S97R6nj"]')).toHaveAttribute('data-track-events', /line_shortlink_click/);
    await expect(panel.locator('a[href="https://line.me/R/oaMessage/%40304zrttj"]')).toBeVisible();
    await expect(panel.locator('a[href="https://line.me/R/oaMessage/%40304zrttj"]')).toHaveAttribute('data-track-event', 'line_chat_click');

    await panel.locator('.close-button').click();
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
    await expect(lineButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('desktop contact panels return focus to visible triggers after close', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    const lineButton = page.locator('.line-button');
    await lineButton.click();
    await expect(page.locator('#line-panel')).toHaveAttribute('aria-hidden', 'false');
    await page.locator('#line-panel .close-button').click();
    await expect(page.locator('#line-panel')).toHaveAttribute('aria-hidden', 'true');
    await expect(lineButton).toBeFocused();

    const inquiryButton = page.locator('.inquiry-button');
    await inquiryButton.click();
    await expect(page.locator('#inquiry-panel')).toHaveAttribute('aria-hidden', 'false');
    await page.locator('#inquiry-panel .close-button').click();
    await expect(page.locator('#inquiry-panel')).toHaveAttribute('aria-hidden', 'true');
    await expect(inquiryButton).toBeFocused();
  });

  test('desktop inquiry button preserves website contact path', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    const inquiryButton = page.locator('.inquiry-button');
    await expect(inquiryButton).toHaveAttribute('aria-expanded', 'false');
    await inquiryButton.click();

    const panel = page.locator('#inquiry-panel');
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await expect(inquiryButton).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.locator('text=ขอ Solar Carport')).toBeVisible();
    await expect(panel.locator('text=ขอ Rooftop Solar')).toBeVisible();
  });

  test('Mobile contact toggle appears on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    const mobileTrigger = page.locator('#contact-trigger-mobile');
    await expect(mobileTrigger).toBeVisible();
    await expect(mobileTrigger).toHaveCSS('width', '48px');
    await expect(mobileTrigger).toHaveCSS('height', '48px');
  });

  test('mobile contact sheet opens and closes with scannable QR', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    const mobileTrigger = page.locator('#contact-trigger-mobile');
    await expect(mobileTrigger).toHaveAttribute('aria-expanded', 'false');
    await mobileTrigger.click();

    const sheet = page.locator('#mobile-panel');
    await expect(sheet).toHaveAttribute('aria-hidden', 'false');
    await expect(mobileTrigger).toHaveAttribute('aria-expanded', 'true');
    const qr = sheet.locator('.qr-image-mobile');
    await expect(qr).toBeVisible();
    await expect(qr).toHaveAttribute('width', '280');
    await expect(qr).toHaveAttribute('height', '280');
    await expect(qr).toHaveAttribute('data-qr-image', '');
    await expect(sheet.locator('.sheet-content')).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 0, 0\)|none/);
    await expect(sheet.locator('a[href="https://lin.ee/S97R6nj"]')).toBeVisible();

    await sheet.locator('.sheet-close').click();
    await expect(sheet).toHaveAttribute('aria-hidden', 'true');
    await expect(mobileTrigger).toHaveAttribute('aria-expanded', 'false');
  });
});

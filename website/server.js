try { require('dotenv').config(); } catch (e) { /* dotenv 为可选依赖，未安装则忽略 */ }
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const sessions = new Set(); // 内存会话 token 集合（重启即失效）

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'config.json');
// 留言数据文件路径
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// ======================= 默认配置（与前台默认数据保持一致） =======================
const DEFAULT_CONFIG = {
  langText: {
    zh: {
      nav_about: "关于井明",
      nav_industry: "市场",
      nav_products: "产品与服务",
      nav_news: "新闻",
      nav_social: "供应链",
      nav_contact: "联系我们",
      footer_address: "地址：四川省遂宁市经济技术开发区渠河南路188号电子电路标准厂房一期3号楼 | 通过ISO9001 & IATF16949",
      statement_title: "🌿 践行绿色制造，共创可持续未来",
      statement_content: "井明电子始终将环境保护与社会责任融入企业发展战略。我们严格遵守 RoHS、REACH 等国际环保指令，投资建设先进的废水处理与中水回用系统，厂区光伏发电覆盖率已达30%。同时，我们积极参与社区公益，关爱员工成长，致力于成为负责任、有温度的行业标杆。未来，我们将持续加大环保投入，推动低碳生产，与合作伙伴共同守护绿水青山。",
      form_title: "获取宣传册/报价",
      form_desc: "“以客户为中心”是井明的核心价值观之一，我们致力于为客户提供高质高效的服务。请填写您的姓名和电子邮件地址以获取宣传册/报价。",
      name_placeholder: "姓名*",
      email_placeholder: "邮箱*",
      company_placeholder: "公司名/网址/留言",
      phone_placeholder: "电话",
      submit: "提交",
      thank_you: "感谢您的留言，我们会尽快联系您。",
      overview: {
        industry: "市场",
        industry_desc: "井明电子深度服务多个战略行业，提供高可靠性PCB解决方案。请从上方下拉菜单中选择具体细分市场，查看详细产品信息。",
        products: "产品与服务",
        products_desc: "我们提供从常规电路板到高精密HDI、高多层板、金属基板等全系列PCB产品。请从下拉菜单中选择具体产品类别，了解制程能力与设备信息。",
        news: "新闻中心",
        news_desc: "了解井明电子最新动态、行业资讯及技术突破。请从下拉菜单中选择“公司新闻”或“行业动态”。",
        social: "供应链",
        social_desc: "井明电子积极履行社会责任，坚持绿色制造与可持续发展。请从下拉菜单查看“环境保护”详细举措。",
        contact: "联系我们",
        contact_desc: "如您有任何需求或疑问，欢迎通过“服务据点”查找离您最近的办事处，或使用“在线留言”功能与我们取得联系。"
      },
      dropdown: {
        about: ["公司简介", "制程能力", "管理体系", "井明荣誉", "组织架构", "品质保证"],
        industry: ["网络通信", "汽车电子", "智能终端", "工控医疗", "电源", "消费电子"],
        products: ["常规电路板", "高密度互联板", "高多层电路板", "金属基板", "制程能力", "生产设备", "检测设备"],
        news: ["公司新闻", "行业动态"],
        social: ["环境保护"],
        contact: ["服务据点", "在线留言"]
      },
      footerLinks: {
        about: { title: "关于井明", items: ["公司简介", "制程能力", "管理体系", "井明荣誉", "组织架构", "品质保证"] },
        industry: { title: "市场", items: ["网络通信", "汽车电子", "智能终端", "工控医疗", "电源", "消费电子"] },
        products: { title: "产品与服务", items: ["常规电路板", "高密度互联板", "高多层电路板", "金属基板", "制程能力", "生产设备", "检测设备"] },
        news: { title: "新闻", items: ["公司新闻", "行业动态"] },
        social: { title: "供应链", items: ["环境保护"] },
        contact: { title: "联系我们", items: ["服务据点", "在线留言"] }
      },
      about_detail: {
        intro: "公司简介",
        intro_text: "四川井明电子有限公司始创于2012年，前身为遂宁豪尔思电子科技有限公司，坐落于遂宁经开区电子电路产业园，现有员工500余人，是一家专业从事PCB电路板研发、设计、精密生产与配套服务的综合性制造企业。公司深耕线路板行业十余年，主营多层板、高精密HDI板、高多层板、金属基板、IC载板，产品广泛应用于汽车电子、网络通信、工控医疗、军工配套、智能终端等领域，可提供一站式定制量产解决方案。企业资质齐全，拥有IATF16949、ISO9001、ISO14001、UL、CQC权威认证，产品符合RoHS环保标准，全程严格品控，满足工业、汽车及高端精密设备使用要求。公司持续深耕高端PCB领域，以精工品质与稳定交付，致力打造为全国优质线路板制造品牌。",
        capability: "制程能力",
        capability_table: {
          headers: ["核心技术项", "井明标准能力", "特级能力"],
          rows: [
            ["最大生产层数", "24层", "30层"],
            ["最小线宽/线距", "75/75μm", "60/60μm"],
            ["最小机械孔径", "0.2mm", "0.15mm"],
            ["最大纵横比", "20:1", "25:1"],
            ["阻抗控制公差", "±10%", "±7%"],
            ["板翘控制", "<0.75%", "<0.5%"]
          ]
        },
        management: "管理体系",
        management_text: "通过IATF16949、ISO9001、ISO14001、UL、CQC等权威认证，实施全流程数字化质量管控。",
        honor: "井明荣誉",
        honor_list: ["国家高新技术企业", "四川省专精特新企业", "遂宁市PCB工程技术研究中心", "中国电子电路行业协会理事单位"],
        structure: "组织架构",
        structure_text: "设有市场中心、研发中心、制造中心、品控中心、供应链管理部及海外事业部。",
        quality: "品质保证",
        quality_text: "从IQC进料检验到成品可靠性测试，全程SPC监控，配备AOI、飞针测试、X-ray、显微镜等先进设备。"
      },
      industry_detail: {
        network: "网络通信",
        network_desc: "高速光模块、路由器、基站天线PCB，低损耗材料，精准阻抗控制。",
        auto: "汽车电子",
        auto_desc: "车规级PCB，满足IATF16949，应用于BMS、ECU、车载娱乐系统。",
        smart: "智能终端",
        smart_desc: "智能手机、平板、可穿戴设备高密度互连板，薄型化设计。",
        medical: "工控医疗",
        medical_desc: "工业控制主板、医疗影像设备PCB，高可靠性长寿命。",
        power: "电源",
        power_desc: "厚铜电源板、金属基板，优异散热性能。",
        consumer: "消费电子",
        consumer_desc: "提供高集成度HDI板，满足轻薄化需求。"
      },
      products_detail: {
        std_pcb: "常规电路板",
        std_pcb_desc: "单双面、多层板，FR-4材料，快速打样。",
        hdi: "高密度互联板",
        hdi_desc: "任意层互连，盲埋孔技术，线宽线距2.5/2.5mil。",
        high_layer: "高多层电路板",
        high_layer_desc: "10-30层，背板、服务器主板，高可靠性。",
        metal_base: "金属基板",
        metal_base_desc: "铝基、铜基板，大功率LED、电源模块。",
        process_cap: "制程能力",
        process_table: {
          headers: ["项目", "能力"],
          rows: [
            ["最小线宽", "2.5mil"],
            ["最小孔径", "0.15mm"],
            ["最大板厚", "8.0mm"],
            ["表面处理", "沉金/沉银/OSP/镀金"]
          ]
        },
        prod_device: "生产设备",
        prod_list: ["数字钻孔机", "填孔脉冲电镀线", "真空蚀刻机", "高层压合机", "LDI曝光机"],
        test_device: "检测设备",
        test_list: ["AOI自动光学检测", "飞针测试机", "X-ray镀层测厚仪", "显微镜", "阻抗测试仪"]
      },
      news_detail: {
        company_news: "公司新闻",
        company_news_list: ["井明电子荣获国家级专精特新小巨人", "井明电子通过IATF16949换版审核", "井明电子举办年度供应商大会"],
        industry_news: "行业动态",
        industry_news_list: ["PCB行业迎来5G+AI新机遇", "新能源汽车带动车用PCB需求增长", "高频高速材料技术研讨会召开"]
      },
      social_detail: {
        environment: "环境保护",
        environment_desc: "井明电子坚持绿色制造，严格遵守RoHS、REACH指令，投资建设先进的废水处理系统，实现中水回用，厂区光伏发电覆盖率已达30%。我们采用无铅、无卤素材料，并通过ISO14001环境管理体系认证。"
      },
      contact_detail: {
        offices: "服务据点",
        office_list: ["总部：四川省遂宁市经济技术开发区渠河南路188号电子电路标准厂房一期3号楼", "华南办事处：深圳南山区", "华东办事处：苏州工业园区"],
        message_title: "在线留言",
        name_placeholder: "您的姓名",
        email_placeholder: "邮箱地址",
        msg_placeholder: "留言内容",
        submit: "提交留言"
      }
    },
    en: {
      nav_about: "About",
      nav_industry: "Markets",
      nav_products: "Products",
      nav_news: "News",
      nav_social: "Supply Chain",
      nav_contact: "Contact",
      footer_address: "Address: Building 3, Phase I, Electronic Circuit Standard Plant, No.188 Quhe South Road, Economic Development Zone, Suining City, Sichuan Province | ISO9001 & IATF16949",
      statement_title: "🌿 Green Manufacturing for a Sustainable Future",
      statement_content: "Kinming Electronics integrates environmental protection and social responsibility into our strategy. We strictly comply with RoHS, REACH, have built advanced wastewater treatment and reuse systems, and achieve 30% solar power coverage. We actively participate in community welfare and care for employee growth.",
      form_title: "Get Brochure / Quote",
      form_desc: "Customer-centric is one of Kinming's core values. We are committed to providing high-quality and efficient service. Please fill in your name and email address to receive our brochure/quote.",
      name_placeholder: "Name*",
      email_placeholder: "Email*",
      company_placeholder: "Company/Website/Message",
      phone_placeholder: "Phone",
      submit: "Submit",
      thank_you: "Thank you! We will contact you soon.",
      overview: {
        industry: "Markets",
        industry_desc: "Kinming serves multiple strategic industries with high-reliability PCB solutions. Please select a specific market segment from the dropdown menu above to view detailed product information.",
        products: "Products & Technology",
        products_desc: "We offer a full range of PCBs from standard to high-precision HDI, high-multilayer, and metal core boards. Select a product category from the dropdown menu to learn about capabilities and equipment.",
        news: "News Center",
        news_desc: "Stay updated with Kinming's latest news, industry trends, and technological breakthroughs. Choose 'Company News' or 'Industry Trends' from the dropdown menu.",
        social: "Supply Chain",
        social_desc: "Kinming actively fulfills its social responsibilities, adhering to green manufacturing and sustainable development. View 'Environmental Protection' details from the dropdown menu.",
        contact: "Contact Us",
        contact_desc: "For any inquiries, please find your nearest office via 'Service Locations' or use the 'Online Message' form to get in touch with us."
      },
      dropdown: {
        about: ["Company Profile", "Process Capability", "Management System", "Honors", "Organization", "Quality Assurance"],
        industry: ["Telecom & Networking", "Automotive Electronics", "Smart Devices", "Industrial & Medical", "Power Supply", "Consumer Electronics"],
        products: ["Standard PCB", "HDI PCB", "High Multilayer", "Metal Core PCB", "Process Capability", "Production Equipment", "Testing Equipment"],
        news: ["Company News", "Industry Trends"],
        social: ["Environmental Protection"],
        contact: ["Service Locations", "Online Message"]
      },
      footerLinks: {
        about: { title: "About", items: ["Company Profile", "Process Capability", "Management System", "Honors", "Organization", "Quality Assurance"] },
        industry: { title: "Markets", items: ["Telecom & Networking", "Automotive Electronics", "Smart Devices", "Industrial & Medical", "Power Supply", "Consumer Electronics"] },
        products: { title: "Products", items: ["Standard PCB", "HDI PCB", "High Multilayer", "Metal Core PCB", "Process Capability", "Production Equipment", "Testing Equipment"] },
        news: { title: "News", items: ["Company News", "Industry Trends"] },
        social: { title: "Supply Chain", items: ["Environmental Protection"] },
        contact: { title: "Contact", items: ["Service Locations", "Online Message"] }
      },
      about_detail: {
        intro: "Company Profile",
        intro_text: "Sichuan Kinming Electronics Co., Ltd. was founded in 2012 (formerly Suining Haoersi Electronic Technology). Located in Suining Economic Development Zone Electronic Circuit Industrial Park, we have over 500 employees, specializing in R&D, design, precision production of PCBs. Main products: multilayer, HDI, high multilayer, metal core, IC substrates. Certifications: IATF16949, ISO9001, ISO14001, UL, CQC, RoHS compliant. Committed to becoming a leading PCB brand with high quality and reliable delivery.",
        capability: "Process Capability",
        capability_table: {
          headers: ["Technology", "Standard", "Special"],
          rows: [
            ["Max Layers", "24", "30"],
            ["Line/Space", "75/75μm", "60/60μm"],
            ["Min Hole", "0.2mm", "0.15mm"],
            ["Aspect Ratio", "20:1", "25:1"],
            ["Impedance", "±10%", "±7%"],
            ["Warpage", "<0.75%", "<0.5%"]
          ]
        },
        management: "Management System",
        management_text: "Certified IATF16949, ISO9001, ISO14001, UL, CQC. Full digital quality control.",
        honor: "Honors",
        honor_list: ["National High-tech Enterprise", "Sichuan Specialized & Sophisticated", "Suining PCB Engineering Center", "CPCA Member"],
        structure: "Organization",
        structure_text: "Departments: Marketing, R&D, Manufacturing, QC, Supply Chain, Overseas.",
        quality: "Quality Assurance",
        quality_text: "From IQC to reliability test, SPC monitoring. Equipped with AOI, flying probe, X-ray, microscope."
      },
      industry_detail: {
        network: "Telecom & Networking",
        network_desc: "High-speed optical modules, routers, base station PCBs.",
        auto: "Automotive Electronics",
        auto_desc: "IATF16949 certified PCBs for BMS, ECU, infotainment.",
        smart: "Smart Devices",
        smart_desc: "HDI for smartphones, tablets, wearables.",
        medical: "Industrial & Medical",
        medical_desc: "High-reliability PCBs for industrial control and medical imaging.",
        power: "Power Supply",
        power_desc: "Heavy copper, metal core for excellent heat dissipation.",
        consumer: "Consumer Electronics",
        consumer_desc: "High-integration HDI PCBs for slim devices."
      },
      products_detail: {
        std_pcb: "Standard PCB",
        std_pcb_desc: "Single/double/multilayer, FR-4, quick-turn.",
        hdi: "HDI PCB",
        hdi_desc: "Any-layer, microvias, 2.5/2.5mil line/space.",
        high_layer: "High Multilayer",
        high_layer_desc: "10-30 layers, backplanes, server boards.",
        metal_base: "Metal Core PCB",
        metal_base_desc: "Aluminum/Copper base for high-power LEDs.",
        process_cap: "Capability",
        process_table: {
          headers: ["Item", "Capability"],
          rows: [
            ["Min Line", "2.5mil"],
            ["Min Hole", "0.15mm"],
            ["Max Thickness", "8.0mm"],
            ["Finishes", "ENIG/ImmAg/OSP/Hard Gold"]
          ]
        },
        prod_device: "Production Equipment",
        prod_list: ["CNC Drilling", "Pulse Plating", "Vacuum Etching", "High Layer Press", "LDI"],
        test_device: "Testing Equipment",
        test_list: ["AOI", "Flying Probe", "X-ray", "Microscope", "Impedance Tester"]
      },
      news_detail: {
        company_news: "Company News",
        company_news_list: ["Kinming awarded National 'Little Giant'", "Kinming passed IATF16949 recertification", "Kinming held annual supplier conference"],
        industry_news: "Industry Trends",
        industry_news_list: ["PCB industry embraces 5G+AI", "EV drives automotive PCB demand", "High-frequency materials seminar"]
      },
      social_detail: {
        environment: "Environmental Protection",
        environment_desc: "Kinming is committed to green manufacturing, strictly following RoHS and REACH. Advanced wastewater treatment and reuse, 30% solar power, ISO14001 certified."
      },
      contact_detail: {
        offices: "Service Locations",
        office_list: ["HQ: Building 3, Phase I, Electronic Circuit Standard Plant, No.188 Quhe South Road, Suining", "Shenzhen Office: Nanshan District", "Suzhou Office: SIP"],
        message_title: "Online Message",
        name_placeholder: "Your Name",
        email_placeholder: "Email",
        msg_placeholder: "Message",
        submit: "Submit"
      }
    }
  },
  carouselData:   {
      about: {
          zh: [
              { image: "images/carousel/company-lobby.jpg", title: "精密智造", desc: "标准化生产基地，高精度PCB生产线" },
              { image: "images/carousel/product-aerospace.jpg", title: "航空航天", desc: "多层高精密板，广泛应用于无人机与航天航空领域" },
              { image: "images/carousel/product-ai-server.jpg", title: "AI服务", desc: "沉金+背钻+树脂塞孔工艺，应用于AI服务器" },
          ],
          en: [
              { image: "images/carousel/company-lobby.jpg", title: "Precision Manufacturing", desc: "Standardized production base with high-precision PCB lines" },
              { image: "images/carousel/product-aerospace.jpg", title: "Aerospace", desc: "High-precision multilayer PCBs for drones and aerospace" },
              { image: "images/carousel/product-ai-server.jpg", title: "AI Server", desc: "ENIG + backdrill + resin plugging for AI servers" },
          ],
      },
      industry: {
          zh: [
              { image: "images/carousel/product-optical.jpg", title: "5G通信", desc: "高速光模块PCB，支持5G与数据中心" },
              { image: "images/carousel/product-automotive.jpg", title: "汽车电子", desc: "高压快充与电源主板，满足车规级可靠性" },
              { image: "images/carousel/product-medical.jpg", title: "医疗设备", desc: "精密医疗仪器控制主板，高可靠性保障" },
          ],
          en: [
              { image: "images/carousel/product-optical.jpg", title: "5G Telecom", desc: "High-speed optical module PCBs for 5G and data centers" },
              { image: "images/carousel/product-automotive.jpg", title: "Automotive", desc: "High-voltage fast charging and power boards for automotive" },
              { image: "images/carousel/product-medical.jpg", title: "Medical", desc: "Precision medical instrument control boards" },
          ],
      },
      products: {
          zh: [
              { image: "images/carousel/product-power.jpg", title: "高多层板", desc: "最高支持30层，适用于电源与服务器主板" },
              { image: "images/carousel/product-consumer.jpg", title: "HDI板", desc: "高密度互连，满足消费类电子产品轻薄化需求" },
          ],
          en: [
              { image: "images/carousel/product-power.jpg", title: "High Multilayer", desc: "Up to 30 layers for power and server boards" },
              { image: "images/carousel/product-consumer.jpg", title: "HDI PCB", desc: "High-density interconnect for compact consumer electronics" },
          ],
      },
      news: {
          zh: [
              { image: "images/carousel/equipment-drill.jpg", title: "行业展会", desc: "亮相国际电子电路展，展示先进制程能力" },
              { image: "images/carousel/equipment-ldi.jpg", title: "技术突破", desc: "精细LDI曝光与自动化测试，持续提升制程精度" },
              { image: "images/carousel/team-building.jpg", title: "团队风采", desc: "登高祈福，聚力同行，共建井明企业文化" },
          ],
          en: [
              { image: "images/carousel/equipment-drill.jpg", title: "Industry Expo", desc: "Showcasing advanced process capabilities at international exhibitions" },
              { image: "images/carousel/equipment-ldi.jpg", title: "Tech Breakthrough", desc: "Fine-pitch LDI exposure and automated testing for higher precision" },
              { image: "images/carousel/team-building.jpg", title: "Team Spirit", desc: "Climbing together, united as one, building Kinming culture" },
          ],
      },
      social: {
          zh: [
              { image: "images/carousel/production-line.jpg", title: "绿色工厂", desc: "洁净车间与规范作业，践行可持续发展" },
          ],
          en: [
              { image: "images/carousel/production-line.jpg", title: "Green Factory", desc: "Clean workshop and standardized operations for sustainable development" },
          ],
      },
      contact: {
          zh: [
              { image: "images/carousel/company-lobby.jpg", title: "全球布局", desc: "总部遂宁，服务欧美日韩等国内外市场" },
          ],
          en: [
              { image: "images/carousel/company-lobby.jpg", title: "Global Presence", desc: "Headquartered in Suining, serving clients worldwide" },
          ],
      },
  }
};

// ======================= 读取/写入配置 =======================
function readConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // 文件不存在或解析失败，写入默认配置
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }
}

function writeConfig(data) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

// ======================= 读取/写入留言 =======================
function readMessages() {
  try {
    const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
    const arr = JSON.parse(data);
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    return [];
  }
}

function writeMessages(arr) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(arr, null, 2));
}

// ======================= 中间件 =======================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // 解析 JSON 请求体

// ======================= API 路由 =======================

// ---------- 公开读取配置（前台需要，无需登录） ----------
app.get('/api/config', (req, res) => {
  const config = readConfig();
  res.json(config);
});

// ---------- 后台登录：校验密码并返回 token ----------
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString('hex');
    sessions.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: '密码错误' });
  }
});

// ---------- 后台登出：吊销 token ----------
app.post('/api/logout', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) sessions.delete(token);
  res.json({ success: true });
});

// ---------- 鉴权中间件 ----------
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token && sessions.has(token)) return next();
  return res.status(401).json({ error: '未授权，请先登录' });
}

// ---------- 保存配置（必须登录） ----------
app.post('/api/config', requireAuth, (req, res) => {
  try {
    writeConfig(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 在线留言：公开提交，落库到 messages.json ----------
app.post('/api/contact', (req, res) => {
  const { name, email, message, company } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: '姓名、邮箱和留言内容均为必填' });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }
  const messages = readMessages();
  messages.push({
    id: Date.now(),
    name: String(name).trim(),
    email: String(email).trim(),
    company: company ? String(company).trim() : '',
    message: String(message).trim(),
    createdAt: new Date().toISOString()
  });
  writeMessages(messages);
  res.json({ success: true });
});

// ---------- 查看留言（需登录，供后台管理） ----------
app.get('/api/contact', requireAuth, (req, res) => {
  res.json(readMessages().reverse()); // 最新在前
});

// ======================= 前端路由回退 =======================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ======================= 启动服务器 =======================
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📁 Config file: ${CONFIG_FILE}`);
  console.log(`🔐 Admin panel: http://localhost:${PORT}/admin.html (default password: admin123)`);
});
/* ============================================================
 * PULSA — Interactive Prototype
 * State + Mock Data + Render + Event Handlers
 * ============================================================ */

const APP = {
    /* ============== STATE ============== */
    state: {
      currentPage: 'page-login',
      currentSection: 'dashboard',
      business: { name: 'Warung Nasi Bakar Pak Eko', category: 'Kuliner / F&B' },
      transactions: [],
      importHistory: [],
      filters: { dateRange: '30d', channel: 'all', type: 'all', search: '' },
      transactionsPage: 1,
      transactionsPerPage: 8,
      goal: null,
    },
  
    productCatalog: [
      { name: 'Nasi Bakar Ayam', price: 25000 },
      { name: 'Nasi Bakar Ikan', price: 30000 },
      { name: 'Es Teh Manis', price: 5000 },
      { name: 'Jus Alpukat', price: 15000 },
      { name: 'Paket Catering x10', price: 350000 },
    ],
  
    channelNames: {
      qris: 'QRIS',
      marketplace: 'Marketplace',
      transfer: 'Transfer Bank',
      manual: 'Manual / Cash',
      pos: 'POS',
    },
  
    channelColors: {
      qris: '#4F46E5',
      marketplace: '#10B981',
      transfer: '#F59E0B',
      manual: '#8B5CF6',
      pos: '#EF4444',
    },
  
    /* ============== UTILITIES ============== */
    fmtIDR(n) {
      return 'Rp ' + Math.round(n).toLocaleString('id-ID');
    },
    fmtIDRshort(n) {
      if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(2) + 'jt';
      if (n >= 1000) return 'Rp ' + (n / 1000).toFixed(0) + 'rb';
      return 'Rp ' + Math.round(n);
    },
    fmtPct(n) {
      const sign = n >= 0 ? '+' : '';
      return sign + n.toFixed(1) + '%';
    },
    fmtDateTime(iso) {
      const d = new Date(iso);
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
      const date = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      return { date, time };
    },
  
    /* ============== MOCK DATA GENERATION ============== */
    generateMockTransactions() {
      const txs = [];
      const now = new Date(); now.setHours(20,0,0,0);
      let id = 1;
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const day = new Date(now);
        day.setDate(day.getDate() - dayOffset);
        const dow = day.getDay();
        const baseTxCount = 11 + Math.floor(Math.random() * 4);
        const weekendBoost = (dow === 5 || dow === 6) ? 4 : 0;
        const txCount = baseTxCount + weekendBoost;
        for (let i = 0; i < txCount; i++) {
          const hour = this.pickPeakHour();
          const minute = Math.floor(Math.random() * 60);
          const txDate = new Date(day);
          txDate.setHours(hour, minute, 0, 0);
          const product = this.productCatalog[Math.floor(Math.random() * this.productCatalog.length)];
          const qty = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 3) + 1;
          const channel = this.pickChannel();
          const type = Math.random() < 0.02 ? 'refund' : 'sale';
          const ref = this.makeRef(channel, txDate, id++);
          txs.push({
            id: ref,
            timestamp: txDate.toISOString(),
            product: product.name,
            unitPrice: product.price,
            qty,
            amount: product.price * qty,
            channel,
            type,
          });
        }
      }
      txs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      this.state.transactions = txs;
    },
  
    pickPeakHour() {
      const r = Math.random();
      if (r < 0.30) return 11 + Math.floor(Math.random() * 3);
      if (r < 0.55) return 18 + Math.floor(Math.random() * 3);
      if (r < 0.80) return 8 + Math.floor(Math.random() * 12);
      return 6 + Math.floor(Math.random() * 16);
    },
  
    pickChannel() {
      const r = Math.random();
      if (r < 0.40) return 'qris';
      if (r < 0.65) return 'marketplace';
      if (r < 0.80) return 'transfer';
      if (r < 0.90) return 'manual';
      return 'pos';
    },
  
    makeRef(channel, date, id) {
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = { qris: 'QRIS', marketplace: 'MP-SHPE', transfer: 'TRF-BCA', manual: 'MNL', pos: 'POS' }[channel];
      return `${prefix}-${dateStr}-${String(id).padStart(3, '0')}`;
    },
  
    generateImportHistory() {
      const today = new Date();
      const mkDate = (offset) => {
        const d = new Date(today); d.setDate(d.getDate() - offset);
        const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      };
      this.state.importHistory = [
        { date: mkDate(2), file: 'transaksi_maret.csv', channel: 'qris', status: 'success', rows: 1500, success: 1487, failed: 13 },
        { date: mkDate(10), file: 'shopee_feb2026.xlsx', channel: 'marketplace', status: 'success', rows: 832, success: 832, failed: 0 },
        { date: mkDate(20), file: 'bca_statement.csv', channel: 'transfer', status: 'success', rows: 245, success: 240, failed: 5 },
      ];
    },
  
    /* ============== FILTERING & STATS ============== */
    getDateRangeStart() {
      const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[this.state.filters.dateRange] || 30;
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - days);
      return d;
    },
  
    filteredTransactionsByDate() {
      const start = this.getDateRangeStart();
      return this.state.transactions.filter(t => new Date(t.timestamp) >= start);
    },
  
    filteredTransactionsForTable() {
      const f = this.state.filters;
      return this.filteredTransactionsByDate().filter(t => {
        if (f.channel !== 'all' && t.channel !== f.channel) return false;
        if (f.type !== 'all' && t.type !== f.type) return false;
        if (f.search && !(`${t.id} ${t.product}`.toLowerCase().includes(f.search.toLowerCase()))) return false;
        return true;
      });
    },
  
    computeKPIs() {
      const inRange = this.filteredTransactionsByDate();
      const sales = inRange.filter(t => t.type === 'sale');
      const refunds = inRange.filter(t => t.type === 'refund');
      const revenue = sales.reduce((s, t) => s + t.amount, 0) - refunds.reduce((s, t) => s + t.amount, 0);
      const txCount = sales.length;
      const avgTx = txCount > 0 ? revenue / txCount : 0;
  
      // Prev period for delta
      const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[this.state.filters.dateRange] || 30;
      const prevStart = new Date(); prevStart.setHours(0,0,0,0); prevStart.setDate(prevStart.getDate() - days * 2);
      const prevEnd = new Date(); prevEnd.setHours(0,0,0,0); prevEnd.setDate(prevEnd.getDate() - days);
      const prevTxs = this.state.transactions.filter(t => {
        const d = new Date(t.timestamp);
        return d >= prevStart && d < prevEnd;
      });
      const prevSales = prevTxs.filter(t => t.type === 'sale');
      const prevRevenue = prevSales.reduce((s, t) => s + t.amount, 0);
      const prevCount = prevSales.length;
      const prevAvg = prevCount > 0 ? prevRevenue / prevCount : 0;
  
      return {
        revenue, txCount, avgTx,
        revenueDelta: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
        txCountDelta: prevCount > 0 ? ((txCount - prevCount) / prevCount) * 100 : 0,
        avgTxDelta: prevAvg > 0 ? ((avgTx - prevAvg) / prevAvg) * 100 : 0,
        prevRevenue, prevCount, prevAvg,
      };
    },
  
    /* ============== HEALTH SCORE ENGINE ============== */
    computeHealthScore() {
      const txs = this.filteredTransactionsByDate().filter(t => t.type === 'sale');
      if (txs.length === 0) {
        return { total: 0, grade: 'D', components: this.emptyComponents() };
      }
      const components = [
        { key: 'revenueStability', name: 'Revenue Stability', weight: 25, score: this.scoreRevenueStability(txs) },
        { key: 'transactionFrequency', name: 'Transaction Frequency', weight: 20, score: this.scoreFrequency(txs) },
        { key: 'customerDiversity', name: 'Customer Diversity', weight: 15, score: this.scoreCustomerDiversity(txs) },
        { key: 'channelDiversity', name: 'Channel Diversity', weight: 15, score: this.scoreChannelDiversity(txs) },
        { key: 'growthTrend', name: 'Growth Trend', weight: 25, score: this.scoreGrowthTrend(txs) },
      ];
      const total = components.reduce((s, c) => s + (c.score * c.weight / 100), 0);
      return { total, grade: this.gradeOf(total), components };
    },
    emptyComponents() {
      return [
        { key: 'revenueStability', name: 'Revenue Stability', weight: 25, score: 0 },
        { key: 'transactionFrequency', name: 'Transaction Frequency', weight: 20, score: 0 },
        { key: 'customerDiversity', name: 'Customer Diversity', weight: 15, score: 0 },
        { key: 'channelDiversity', name: 'Channel Diversity', weight: 15, score: 0 },
        { key: 'growthTrend', name: 'Growth Trend', weight: 25, score: 0 },
      ];
    },
    gradeOf(score) {
      if (score >= 80) return 'A';
      if (score >= 65) return 'B';
      if (score >= 50) return 'C';
      return 'D';
    },
    scoreRevenueStability(txs) {
      const daily = this.groupByDay(txs).map(d => d.revenue);
      if (daily.length < 2) return 50;
      const mean = daily.reduce((s, x) => s + x, 0) / daily.length;
      const variance = daily.reduce((s, x) => s + (x - mean) ** 2, 0) / daily.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
      return Math.max(0, Math.min(100, Math.round((1 - Math.min(cv, 1)) * 100)));
    },
    scoreFrequency(txs) {
      const days = Math.max(1, Math.ceil((Date.now() - this.getDateRangeStart().getTime()) / 86400000));
      const tpd = txs.length / days;
      const benchmark = 12;
      return Math.max(0, Math.min(100, Math.round((tpd / benchmark) * 80)));
    },
    scoreCustomerDiversity(txs) {
      const refSet = new Set(txs.map(t => t.id));
      const ratio = refSet.size / Math.max(1, txs.length);
      return Math.max(30, Math.min(100, Math.round(50 + ratio * 35)));
    },
    scoreChannelDiversity(txs) {
      const channels = new Set(txs.map(t => t.channel));
      const n = channels.size;
      const counts = {};
      txs.forEach(t => { counts[t.channel] = (counts[t.channel] || 0) + 1; });
      const total = txs.length;
      const shares = Object.values(counts).map(c => c / total);
      const hhi = shares.reduce((s, x) => s + x * x, 0);
      const balance = (1 - hhi);
      return Math.max(20, Math.min(100, Math.round(n * 15 + balance * 50)));
    },
    scoreGrowthTrend(txs) {
      const daily = this.groupByDay(txs);
      if (daily.length < 4) return 50;
      const xs = daily.map((_, i) => i);
      const ys = daily.map(d => d.revenue);
      const meanX = xs.reduce((s, x) => s + x, 0) / xs.length;
      const meanY = ys.reduce((s, y) => s + y, 0) / ys.length;
      let num = 0, den = 0;
      for (let i = 0; i < xs.length; i++) {
        num += (xs[i] - meanX) * (ys[i] - meanY);
        den += (xs[i] - meanX) ** 2;
      }
      const slope = den > 0 ? num / den : 0;
      const normalized = slope / (meanY || 1);
      return Math.max(0, Math.min(100, Math.round(50 + normalized * 1500)));
    },
    groupByDay(txs) {
      const map = {};
      txs.forEach(t => {
        const d = new Date(t.timestamp);
        const key = d.toISOString().slice(0, 10);
        if (!map[key]) map[key] = { day: key, revenue: 0, count: 0 };
        map[key].revenue += t.amount;
        map[key].count += 1;
      });
      return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
    },
  
    /* ============== GOAL ENGINE ============== */
    renderGoalBanner() {
      const banner = document.getElementById('goalBanner');
      if (!banner) return;
      const goal = this.state.goal;
      const valueEl = document.getElementById('goalValue');
      const progressEl = document.getElementById('goalProgress');
      const btnText = document.getElementById('setGoalBtnText');
      if (!goal) {
        valueEl.textContent = 'Belum disetel. Setel target supaya rekomendasi disesuaikan.';
        if (progressEl) progressEl.replaceChildren();
        if (btnText) btnText.textContent = 'Setel Target';
        banner.classList.remove('goal-active');
        return;
      }
      const txs = this.filteredTransactionsByDate().filter(t => t.type === 'sale');
      const currentRev = txs.reduce((s, t) => s + t.amount, 0);
      const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[this.state.filters.dateRange] || 30;
      const projectedMonthly = (currentRev / days) * 30;
      const targetMonthly = goal.baseRevenue * (1 + goal.upliftPct / 100);
      const progressPct = Math.min(100, Math.round((projectedMonthly / targetMonthly) * 100));
      valueEl.textContent = `Naikkan omzet ${goal.upliftPct}% via ${goal.targetProduct} dalam ${goal.horizonDays} hari`;
      if (progressEl) {
        progressEl.replaceChildren();
        const bar = document.createElement('div');
        bar.className = 'goal-progress-bar';
        const fill = document.createElement('div');
        fill.className = 'goal-progress-fill';
        fill.style.width = `${progressPct}%`;
        bar.appendChild(fill);
        progressEl.appendChild(bar);
        const lbl = document.createElement('span');
        lbl.className = 'goal-progress-label';
        lbl.textContent = `Progres: ${progressPct}% (proyeksi bulanan ${this.fmtIDRshort(projectedMonthly)} dari target ${this.fmtIDRshort(targetMonthly)})`;
        progressEl.appendChild(lbl);
      }
      if (btnText) btnText.textContent = 'Ubah Target';
      banner.classList.add('goal-active');
    },
  
    setGoal(upliftPct, targetProduct, horizonDays) {
      const txs = this.filteredTransactionsByDate().filter(t => t.type === 'sale');
      const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[this.state.filters.dateRange] || 30;
      const currentRev = txs.reduce((s, t) => s + t.amount, 0);
      const baseMonthly = (currentRev / days) * 30;
      this.state.goal = {
        upliftPct: Number(upliftPct),
        targetProduct,
        horizonDays: Number(horizonDays),
        baseRevenue: baseMonthly,
        setAt: new Date().toISOString(),
      };
      this.toast(`Target disetel: naikkan omzet ${upliftPct}% via ${targetProduct}`, 'success');
      this.renderDashboard();
      this.renderRecommendations();
    },
  
    clearGoal() {
      this.state.goal = null;
      this.toast('Target dihapus', 'info');
      this.renderDashboard();
      this.renderRecommendations();
    },
  
    /* ============== RECOMMENDATIONS ENGINE ============== */
    generateRecommendations() {
      const txs = this.filteredTransactionsByDate().filter(t => t.type === 'sale');
      const recs = [];
      if (txs.length === 0) return recs;
  
      // 0. Goal-driven recommendation (highest priority if goal set)
      if (this.state.goal) {
        const g = this.state.goal;
        const goalTxs = txs.filter(t => t.product === g.targetProduct);
        const goalShare = goalTxs.length / txs.length;
        const goalRev = goalTxs.reduce((s, t) => s + t.amount, 0);
        const uplifNeeded = g.upliftPct;
        const additionalUnits = Math.ceil((goalRev * (uplifNeeded / 100)) / (this.productCatalog.find(p => p.name === g.targetProduct)?.price || 1));
        recs.push({
          type: 'promotion',
          priority: 'high',
          title: `[Target] Dorong ${g.targetProduct} +${additionalUnits} unit dalam ${g.horizonDays} hari`,
          desc: `Untuk capai target naik omzet ${g.upliftPct}%, perlu jual ${additionalUnits} unit ${g.targetProduct} tambahan. Saat ini ${g.targetProduct} = ${Math.round(goalShare * 100)}% transaksi.`,
          meta: `Target user-driven — berlaku sampai ${g.horizonDays} hari`,
        });
      }
  
      // 1. Top product / day of week
      const productByDow = {};
      txs.forEach(t => {
        const dow = new Date(t.timestamp).getDay();
        const key = `${t.product}|${dow}`;
        productByDow[key] = (productByDow[key] || 0) + 1;
      });
      const dowNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      let bestKey = null, bestCount = 0;
      Object.entries(productByDow).forEach(([k, c]) => { if (c > bestCount) { bestCount = c; bestKey = k; } });
      if (bestKey) {
        const [prod, dow] = bestKey.split('|');
        recs.push({
          type: 'stock',
          priority: 'high',
          title: `Tambah stok ${prod} 20% di hari ${dowNames[dow]}`,
          desc: `Hari ${dowNames[dow]} adalah peak untuk ${prod} (${bestCount} unit terjual dalam periode ini).`,
          meta: 'Berlaku sampai 7 hari ke depan',
        });
      }
  
      // 2. Peak hour cluster
      const hourCounts = Array(24).fill(0);
      txs.forEach(t => { hourCounts[new Date(t.timestamp).getHours()]++; });
      const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
      if (hourCounts[peakHour] > 0) {
        recs.push({
          type: 'operational',
          priority: 'medium',
          title: `Optimalkan kapasitas pada jam ${String(peakHour).padStart(2,'0')}:00`,
          desc: `Jam ${peakHour}:00 punya volume transaksi tertinggi (${hourCounts[peakHour]} tx). Tambah staff/stok pada window ini.`,
          meta: 'Berlaku sampai re-evaluasi mingguan',
        });
      }
  
      // 3. Bundling
      const productCounts = {};
      txs.forEach(t => { productCounts[t.product] = (productCounts[t.product] || 0) + 1; });
      const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
      if (sortedProducts.length >= 2) {
        recs.push({
          type: 'promotion',
          priority: 'medium',
          title: `Bundling: ${sortedProducts[0][0]} + ${sortedProducts[1][0]} diskon 10%`,
          desc: `Dua produk terlaris (${sortedProducts[0][1]} & ${sortedProducts[1][1]} unit). Bundling meningkatkan rata-rata nilai transaksi.`,
          meta: 'Berlaku sampai 14 hari ke depan',
        });
      }
  
      // 4. Underperforming product
      if (sortedProducts.length >= 3) {
        const last = sortedProducts[sortedProducts.length - 1];
        recs.push({
          type: 'stock',
          priority: 'low',
          title: `Kurangi prep ${last[0]} di hari sepi`,
          desc: `${last[0]} adalah produk dengan velocity terendah (${last[1]} unit). Mengurangi prep menghemat bahan baku.`,
          meta: 'Berlaku sampai 7 hari ke depan',
        });
      }
  
      // 5. Channel imbalance
      const chCounts = {};
      txs.forEach(t => { chCounts[t.channel] = (chCounts[t.channel] || 0) + 1; });
      const totalCh = txs.length;
      const dominant = Object.entries(chCounts).sort((a, b) => b[1] - a[1])[0];
      if (dominant && dominant[1] / totalCh > 0.55) {
        recs.push({
          type: 'operational',
          priority: 'low',
          title: `Diversifikasi channel pembayaran`,
          desc: `${this.channelNames[dominant[0]]} mendominasi ${Math.round(dominant[1] / totalCh * 100)}% transaksi. Pertimbangkan promosi di channel lain.`,
          meta: 'Strategis — review bulanan',
        });
      }
  
      return recs;
    },
  
    /* ============== RENDER: NAVIGATION ============== */
    showPage(pageId) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(pageId)?.classList.add('active');
      this.state.currentPage = pageId;
    },
  
    showSection(sectionId, navItem) {
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-' + sectionId)?.classList.add('active');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      if (navItem) navItem.classList.add('active');
      else {
        const auto = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
        auto?.classList.add('active');
      }
      const titles = {
        dashboard: 'Dashboard',
        transactions: 'Transaksi',
        analytics: 'Analytics',
        'health-score': 'Health Score',
        recommendations: 'Rekomendasi AI',
        ingestion: 'Import Data',
      };
      const titleEl = document.getElementById('pageTitle');
      if (titleEl) titleEl.textContent = titles[sectionId] || 'Dashboard';
      this.state.currentSection = sectionId;
      this.renderSection(sectionId);
    },
  
    renderSection(sectionId) {
      switch (sectionId) {
        case 'dashboard': this.renderDashboard(); break;
        case 'transactions': this.renderTransactions(); break;
        case 'analytics': this.renderAnalytics(); break;
        case 'health-score': this.renderHealthScore(); break;
        case 'recommendations': this.renderRecommendations(); break;
        case 'ingestion': this.renderIngestion(); break;
      }
    },
  
    renderAll() {
      this.renderDashboard();
      this.renderTransactions();
      this.renderAnalytics();
      this.renderHealthScore();
      this.renderRecommendations();
      this.renderIngestion();
    },
  
    /* ============== RENDER: DASHBOARD ============== */
    renderDashboard() {
      const kpi = this.computeKPIs();
      const hs = this.computeHealthScore();
  
      document.getElementById('kpiRevenue').textContent = this.fmtIDR(kpi.revenue);
      document.getElementById('kpiRevenueDelta').textContent = this.fmtPct(kpi.revenueDelta);
      document.getElementById('kpiRevenueDelta').className = 'kpi-badge ' + (kpi.revenueDelta >= 0 ? 'up' : 'down');
      document.getElementById('kpiRevenueSub').textContent = `vs ${this.fmtIDR(kpi.prevRevenue)} periode sebelumnya`;
  
      document.getElementById('kpiTxCount').textContent = kpi.txCount.toLocaleString('id-ID');
      document.getElementById('kpiTxCountDelta').textContent = this.fmtPct(kpi.txCountDelta);
      document.getElementById('kpiTxCountDelta').className = 'kpi-badge ' + (kpi.txCountDelta >= 0 ? 'up' : 'down');
      document.getElementById('kpiTxCountSub').textContent = `vs ${kpi.prevCount.toLocaleString('id-ID')} periode sebelumnya`;
  
      document.getElementById('kpiAvgTx').textContent = this.fmtIDR(kpi.avgTx);
      document.getElementById('kpiAvgTxDelta').textContent = this.fmtPct(kpi.avgTxDelta);
      document.getElementById('kpiAvgTxDelta').className = 'kpi-badge ' + (kpi.avgTxDelta >= 0 ? 'up' : 'down');
      document.getElementById('kpiAvgTxSub').textContent = `vs ${this.fmtIDR(kpi.prevAvg)} periode sebelumnya`;
  
      document.getElementById('kpiHealth').textContent = hs.total.toFixed(1);
      document.getElementById('kpiHealthGrade').textContent = hs.grade;
      const gradeLabel = { A: 'Sangat Baik', B: 'Baik', C: 'Cukup', D: 'Perlu Perhatian' }[hs.grade];
      document.getElementById('kpiHealthSub').textContent = `dari 100 — ${gradeLabel}`;
  
      this.renderTrendChart();
      this.renderChannelDonut();
      this.renderTopProductsCard();
      this.renderRecommendationsCard();
      this.renderGoalBanner();
    },
  
    renderTrendChart() {
      const txs = this.filteredTransactionsByDate().filter(t => t.type === 'sale');
      const daily = this.groupByDay(txs);
      const range = this.state.filters.dateRange;
      let bars = daily;
      let title = 'Tren Revenue Harian';
  
      if (range === '7d') { bars = daily.slice(-7); title = 'Tren Revenue (7 Hari)'; }
      else if (range === '30d') { bars = daily.slice(-30); title = 'Tren Revenue (30 Hari)'; }
      else if (range === '90d') {
        bars = this.groupByWeek(txs).slice(-13);
        title = 'Tren Revenue (90 Hari, Mingguan)';
      } else if (range === '1y') {
        bars = this.groupByMonth(txs).slice(-12);
        title = 'Tren Revenue (1 Tahun, Bulanan)';
      }
  
      const titleEl = document.getElementById('trendChartTitle');
      if (titleEl) titleEl.textContent = title;
  
      const max = Math.max(...bars.map(d => d.revenue), 1);
      const container = document.getElementById('trendChart');
      if (!container) return;
      container.replaceChildren();
      bars.forEach((d) => {
        const h = (d.revenue / max) * 100;
        const dateLabel = d.label || d.day.slice(8, 10);
        const bar = document.createElement('div');
        bar.className = 'bar-group';
        bar.style.setProperty('--h1', `${h}%`);
        bar.style.setProperty('--h2', `${Math.max(h - 15, 5)}%`);
        const b1 = document.createElement('div'); b1.className = 'bar b1'; b1.title = this.fmtIDR(d.revenue);
        const b2 = document.createElement('div'); b2.className = 'bar b2';
        const span = document.createElement('span'); span.textContent = dateLabel;
        bar.appendChild(b1); bar.appendChild(b2); bar.appendChild(span);
        container.appendChild(bar);
      });
    },
  
    groupByWeek(txs) {
      const map = {};
      txs.forEach(t => {
        const d = new Date(t.timestamp);
        const week = Math.floor(d.getTime() / (7 * 86400000));
        if (!map[week]) {
          const start = new Date(week * 7 * 86400000);
          map[week] = { day: start.toISOString().slice(0,10), revenue: 0, count: 0, label: `${start.getDate()}/${start.getMonth()+1}` };
        }
        map[week].revenue += t.amount;
        map[week].count += 1;
      });
      return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
    },
  
    groupByMonth(txs) {
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
      const map = {};
      txs.forEach(t => {
        const d = new Date(t.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (!map[key]) map[key] = { day: key + '-01', revenue: 0, count: 0, label: months[d.getMonth()] };
        map[key].revenue += t.amount;
        map[key].count += 1;
      });
      return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
    },
  
    renderChannelDonut() {
      const txs = this.filteredTransactionsByDate().filter(t => t.type === 'sale');
      const counts = {};
      txs.forEach(t => { counts[t.channel] = (counts[t.channel] || 0) + 1; });
      const total = txs.length || 1;
      const channels = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  
      const svg = document.getElementById('donutSvg');
      const legend = document.getElementById('donutLegend');
      const centerText = document.getElementById('donutCenterText');
      if (centerText) centerText.textContent = total.toLocaleString('id-ID');
  
      const segments = svg?.querySelectorAll('.donut-segment');
      segments?.forEach(s => s.remove());
  
      let offset = 0;
      const circumference = 2 * Math.PI * 60;
      channels.forEach(([ch, c]) => {
        const len = (c / total) * circumference;
        const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        segment.setAttribute('cx', 80);
        segment.setAttribute('cy', 80);
        segment.setAttribute('r', 60);
        segment.setAttribute('fill', 'none');
        segment.setAttribute('stroke', this.channelColors[ch] || '#94A3B8');
        segment.setAttribute('stroke-width', 20);
        segment.setAttribute('stroke-dasharray', `${len} ${circumference - len}`);
        segment.setAttribute('stroke-dashoffset', `-${offset}`);
        segment.classList.add('donut-segment');
        svg?.insertBefore(segment, svg.querySelector('text'));
        offset += len;
      });
  
      if (legend) {
        legend.innerHTML = '';
        channels.forEach(([ch, c]) => {
          const pct = Math.round((c / total) * 100);
          const row = document.createElement('div');
          row.className = 'legend-row';
          row.innerHTML = `<span class="dot" style="background:${this.channelColors[ch]}"></span>${this.channelNames[ch]}<span class="legend-val">${pct}%</span>`;
          legend.appendChild(row);
        });
      }
    },
  
    renderTopProductsCard() {
      const txs = this.filteredTransactionsByDate().filter(t => t.type === 'sale');
      const map = {};
      txs.forEach(t => {
        if (!map[t.product]) map[t.product] = { product: t.product, count: 0, revenue: 0 };
        map[t.product].count += t.qty;
        map[t.product].revenue += t.amount;
      });
      const sorted = Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 4);
      const maxRev = sorted[0]?.revenue || 1;
      const container = document.getElementById('topProductsList');
      if (!container) return;
      container.innerHTML = '';
      sorted.forEach((p, i) => {
        const pct = Math.round((p.revenue / maxRev) * 100);
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `
          <div class="product-rank">${i + 1}</div>
          <div class="product-info">
            <span class="product-name">${p.product}</span>
            <span class="product-count">${p.count} terjual</span>
          </div>
          <div class="product-revenue">${this.fmtIDR(p.revenue)}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        `;
        container.appendChild(div);
      });
    },
  
    renderRecommendationsCard() {
      const recs = this.generateRecommendations().slice(0, 3);
      const container = document.getElementById('dashRecsList');
      const badge = document.getElementById('dashRecsBadge');
      if (badge) badge.textContent = `${recs.length} baru`;
      if (!container) return;
      container.innerHTML = '';
      const priorityLabel = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
      recs.forEach(r => {
        const div = document.createElement('div');
        div.className = `rec-item rec-${r.priority}`;
        div.innerHTML = `
          <div class="rec-icon"><svg viewBox="0 0 16 16" fill="currentColor" width="16"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z"/></svg></div>
          <div class="rec-content">
            <span class="rec-title">${r.title}</span>
            <span class="rec-desc">${r.desc}</span>
          </div>
          <span class="rec-priority ${r.priority}">${priorityLabel[r.priority]}</span>
        `;
        container.appendChild(div);
      });
    },
  
    /* ============== RENDER: TRANSACTIONS ============== */
    renderTransactions() {
      const all = this.filteredTransactionsForTable();
      const total = all.length;
      const perPage = this.state.transactionsPerPage;
      const page = this.state.transactionsPage;
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      const startIdx = (page - 1) * perPage;
      const slice = all.slice(startIdx, startIdx + perPage);
  
      const tbody = document.getElementById('transactionsBody');
      if (!tbody) return;
      tbody.innerHTML = '';
      slice.forEach(t => {
        const dt = this.fmtDateTime(t.timestamp);
        const typeClass = t.type === 'refund' ? 'refund' : 'sale';
        const typeLabel = t.type === 'refund' ? 'Refund' : 'Sale';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="text-primary">${dt.date}</span><br><span class="text-muted">${dt.time}</span></td>
          <td class="text-mono">${t.id}</td>
          <td>${t.product}</td>
          <td><span class="channel-badge ${t.channel}">${this.channelNames[t.channel]}</span></td>
          <td>${t.qty}</td>
          <td class="text-right"><strong>${this.fmtIDR(t.amount)}</strong></td>
          <td><span class="type-badge ${typeClass}">${typeLabel}</span></td>
        `;
        tbody.appendChild(tr);
      });
  
      const info = document.getElementById('transactionsInfo');
      if (info) info.textContent = total === 0
        ? 'Tidak ada transaksi pada filter ini'
        : `Menampilkan ${startIdx + 1}-${Math.min(startIdx + perPage, total)} dari ${total} transaksi`;
  
      this.renderPagination(page, totalPages);
    },
  
    renderPagination(page, totalPages) {
      const pag = document.getElementById('transactionsPagination');
      if (!pag) return;
      pag.innerHTML = '';
      const mkBtn = (label, disabled, onClick, active = false) => {
        const b = document.createElement('button');
        b.className = 'page-btn' + (active ? ' active' : '');
        b.disabled = disabled;
        b.innerHTML = label;
        if (!disabled) b.addEventListener('click', onClick);
        return b;
      };
      pag.appendChild(mkBtn('&laquo;', page <= 1, () => { this.state.transactionsPage--; this.renderTransactions(); }));
      const maxBtn = Math.min(totalPages, 5);
      for (let i = 1; i <= maxBtn; i++) {
        pag.appendChild(mkBtn(String(i), false, () => { this.state.transactionsPage = i; this.renderTransactions(); }, i === page));
      }
      if (totalPages > 5) {
        const dots = document.createElement('span'); dots.className = 'page-dots'; dots.textContent = '...';
        pag.appendChild(dots);
        pag.appendChild(mkBtn(String(totalPages), false, () => { this.state.transactionsPage = totalPages; this.renderTransactions(); }, totalPages === page));
      }
      pag.appendChild(mkBtn('&raquo;', page >= totalPages, () => { this.state.transactionsPage++; this.renderTransactions(); }));
    },
  
    /* ============== RENDER: ANALYTICS ============== */
    renderAnalytics() {
      this.renderHeatmap();
      this.renderProductPerformance();
      this.renderChannelRevenue();
    },
  
    renderHeatmap() {
      const txs = this.filteredTransactionsByDate().filter(t => t.type === 'sale');
      const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
      txs.forEach(t => {
        const d = new Date(t.timestamp);
        heat[d.getDay()][d.getHours()]++;
      });
      const max = Math.max(...heat.flat(), 1);
      const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  
      const container = document.getElementById('heatmapContainer');
      if (!container) return;
      container.innerHTML = '';
  
      dayOrder.forEach(d => {
        const row = document.createElement('div');
        row.className = 'heatmap-row';
        const label = document.createElement('span');
        label.className = 'heatmap-label';
        label.textContent = dayLabels[d];
        row.appendChild(label);
        for (let h = 0; h < 24; h++) {
          const cell = document.createElement('div');
          const lvl = Math.min(5, Math.floor((heat[d][h] / max) * 6));
          cell.className = `heatmap-cell l${lvl}`;
          cell.title = `${dayLabels[d]} ${String(h).padStart(2,'0')}:00 — ${heat[d][h]} tx`;
          row.appendChild(cell);
        }
        container.appendChild(row);
      });
  
      const hoursRow = document.createElement('div');
      hoursRow.className = 'heatmap-hours';
      [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].forEach(h => {
        const s = document.createElement('span'); s.textContent = String(h).padStart(2, '0'); hoursRow.appendChild(s);
      });
      container.appendChild(hoursRow);
  
      // Peak label
      let peakDay = 0, peakHour = 0, peakVal = 0;
      heat.forEach((row, d) => row.forEach((v, h) => { if (v > peakVal) { peakVal = v; peakDay = d; peakHour = h; } }));
      const badge = document.getElementById('peakBadge');
      if (badge) badge.textContent = `Jam tersibuk: ${dayLabels[peakDay]} ${String(peakHour).padStart(2,'0')}:00`;
    },
  
    renderProductPerformance() {
      const txs = this.filteredTransactionsByDate().filter(t => t.type === 'sale');
      const map = {};
      txs.forEach(t => { map[t.product] = (map[t.product] || 0) + t.amount; });
      const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
      const max = sorted[0]?.[1] || 1;
      const container = document.getElementById('productPerfList');
      if (!container) return;
      container.innerHTML = '';
      const colors = ['#4F46E5', '#4F46E5', '#10B981', '#10B981', '#F59E0B', '#8B5CF6'];
      sorted.forEach(([prod, rev], i) => {
        const pct = Math.round((rev / max) * 100);
        const div = document.createElement('div');
        div.className = 'hbar';
        div.innerHTML = `
          <span class="hbar-label">${prod}</span>
          <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${colors[i] || '#94A3B8'}"></div></div>
          <span class="hbar-val">${this.fmtIDRshort(rev)}</span>
        `;
        container.appendChild(div);
      });
    },
  
    renderChannelRevenue() {
      const txs = this.filteredTransactionsByDate().filter(t => t.type === 'sale');
      const map = {};
      txs.forEach(t => { map[t.channel] = (map[t.channel] || 0) + t.amount; });
      const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
      const max = sorted[0]?.[1] || 1;
      const container = document.getElementById('channelRevenueList');
      if (!container) return;
      container.innerHTML = '';
      sorted.forEach(([ch, rev]) => {
        const pct = Math.round((rev / max) * 100);
        const div = document.createElement('div');
        div.className = 'hbar';
        div.innerHTML = `
          <span class="hbar-label">${this.channelNames[ch]}</span>
          <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${this.channelColors[ch]}"></div></div>
          <span class="hbar-val">${this.fmtIDRshort(rev)}</span>
        `;
        container.appendChild(div);
      });
    },
  
    /* ============== RENDER: HEALTH SCORE ============== */
    /* ============== HEALTH SCORE SHARE ============== */
    async handleShareScore() {
      const hs = this.computeHealthScore();
      const businessName = this.state.business.name;
      const text = `Business Health Score saya di PULSA: ${hs.total.toFixed(1)}/100 (${hs.grade})\n\n` +
        `📊 ${businessName}\n` +
        hs.components.map(c => `• ${c.name}: ${c.score.toFixed(0)}`).join('\n') +
        `\n\nDicek lewat PULSA — AI Financial Intelligence untuk UMKM.`;
      const url = 'https://github.com/handokobeni/pulsa';
  
      if (navigator.share) {
        try {
          await navigator.share({ title: 'PULSA Business Health Score', text, url });
          this.toast('Skor berhasil dibagikan', 'success');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }
  
      try {
        await navigator.clipboard.writeText(text + '\n' + url);
        this.toast('Teks skor disalin ke clipboard. Paste di WhatsApp/IG/dll.', 'success');
      } catch (err) {
        this.toast('Gagal menyalin. Pakai browser modern atau aktifkan clipboard permission.', 'error');
      }
  
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    },
  
    renderHealthScore() {
      const hs = this.computeHealthScore();
      const big = document.getElementById('healthBigScore');
      if (big) big.textContent = hs.total.toFixed(1);
      const grade = document.getElementById('healthGrade');
      if (grade) grade.textContent = hs.grade;
  
      const arc = document.querySelector('.score-arc');
      if (arc) {
        const circumference = 2 * Math.PI * 85;
        const offset = circumference - (hs.total / 100) * circumference;
        arc.setAttribute('stroke-dasharray', circumference);
        arc.setAttribute('stroke-dashoffset', offset);
      }
  
      const summary = document.getElementById('healthMetaPeriod');
      if (summary) {
        const start = this.getDateRangeStart();
        const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
        const now = new Date();
        summary.textContent = `Periode: ${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} — ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      }
      const lastCalc = document.getElementById('healthMetaCalc');
      if (lastCalc) {
        const now = new Date();
        lastCalc.textContent = `Terakhir dihitung: ${now.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' })}`;
      }
  
      const container = document.getElementById('healthComponents');
      if (!container) return;
      container.innerHTML = '';
      hs.components.forEach(c => {
        const color = c.score >= 75 ? '#10B981' : c.score >= 60 ? '#F59E0B' : '#EF4444';
        const div = document.createElement('div');
        div.className = 'health-comp-card';
        const desc = this.componentDescription(c.key, c.score);
        div.innerHTML = `
          <div class="comp-header">
            <span class="comp-name">${c.name}</span>
            <span class="comp-score">${c.score.toFixed(1)}</span>
          </div>
          <div class="comp-bar"><div class="comp-fill" style="width:${c.score}%;background:${color}"></div></div>
          <p class="comp-desc">${desc}</p>
        `;
        container.appendChild(div);
      });
    },
  
    componentDescription(key, score) {
      const map = {
        revenueStability: {
          high: 'Konsistensi pendapatan harian Anda stabil.',
          mid: 'Konsistensi pendapatan cukup, masih bisa lebih stabil.',
          low: 'Fluktuasi pendapatan tinggi — perlu diversifikasi atau promosi yang konsisten.',
        },
        transactionFrequency: {
          high: 'Frekuensi transaksi sangat baik untuk sektor Anda.',
          mid: 'Frekuensi transaksi cukup baik, bisa ditingkatkan.',
          low: 'Frekuensi transaksi di bawah rata-rata sektor — pertimbangkan strategi akuisisi.',
        },
        customerDiversity: {
          high: 'Diversifikasi pelanggan baik.',
          mid: 'Diversifikasi pelanggan perlu ditingkatkan.',
          low: 'Bergantung pada segmen pelanggan terbatas — risiko konsentrasi.',
        },
        channelDiversity: {
          high: 'Penggunaan multi-channel sangat baik.',
          mid: 'Multi-channel cukup, bisa diperluas.',
          low: 'Terlalu bergantung pada satu channel — diversifikasi disarankan.',
        },
        growthTrend: {
          high: 'Tren pertumbuhan positif dan konsisten.',
          mid: 'Tren pertumbuhan stabil — peluang untuk akselerasi.',
          low: 'Tren pertumbuhan negatif atau stagnan — perlu intervensi.',
        },
      };
      const tier = score >= 75 ? 'high' : score >= 60 ? 'mid' : 'low';
      return map[key]?.[tier] || '';
    },
  
    /* ============== RENDER: RECOMMENDATIONS ============== */
    renderRecommendations() {
      const recs = this.generateRecommendations();
      const container = document.getElementById('recsFullList');
      if (!container) return;
      container.innerHTML = '';
      const typeLabel = { stock: 'Stok', operational: 'Operasional', promotion: 'Promosi' };
      const priorityLabel = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
      if (recs.length === 0) {
        container.innerHTML = '<p class="text-muted" style="padding:2rem;text-align:center;">Belum ada rekomendasi. Tambah lebih banyak transaksi untuk memunculkan insight.</p>';
        return;
      }
      recs.forEach(r => {
        const div = document.createElement('div');
        div.className = 'rec-full-item';
        div.innerHTML = `
          <div class="rec-full-left">
            <span class="rec-type-badge ${r.type}">${typeLabel[r.type]}</span>
            <div>
              <h4>${r.title}</h4>
              <p>${r.desc}</p>
              <span class="rec-meta">${r.meta}</span>
            </div>
          </div>
          <span class="rec-priority ${r.priority}">${priorityLabel[r.priority]}</span>
        `;
        container.appendChild(div);
      });
    },
  
    /* ============== RENDER: INGESTION ============== */
    renderIngestion() {
      this.renderImportHistory();
      this.populateManualProductSelect();
    },
  
    renderImportHistory() {
      const tbody = document.getElementById('importHistoryBody');
      if (!tbody) return;
      tbody.innerHTML = '';
      this.state.importHistory.forEach(h => {
        const tr = document.createElement('tr');
        const statusClass = h.status;
        const statusLabel = { success: 'Selesai', processing: 'Proses...', failed: 'Gagal' }[h.status] || h.status;
        tr.innerHTML = `
          <td>${h.date}</td>
          <td class="text-mono">${h.file}</td>
          <td><span class="channel-badge ${h.channel}">${this.channelNames[h.channel]}</span></td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
          <td>${h.rows.toLocaleString('id-ID')}</td>
          <td class="text-success">${h.success.toLocaleString('id-ID')}</td>
          <td class="text-danger">${h.failed.toLocaleString('id-ID')}</td>
        `;
        tbody.appendChild(tr);
      });
    },
  
    populateManualProductSelect() {
      const select = document.getElementById('manualProductSelect');
      if (!select) return;
      select.innerHTML = '';
      this.productCatalog.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = `${p.name} — ${this.fmtIDR(p.price)}`;
        select.appendChild(opt);
      });
    },
  
    /* ============== EVENT HANDLERS ============== */
    attachListeners() {
      // Login
      const loginForm = document.getElementById('loginForm');
      loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.showPage('page-app');
        this.toast('Berhasil masuk. Selamat datang!', 'success');
        this.renderAll();
      });
  
      // Register
      const registerForm = document.getElementById('registerForm');
      registerForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.showPage('page-app');
        this.toast('Akun berhasil dibuat. Selamat datang!', 'success');
        this.renderAll();
      });
  
      // Sidebar nav
      document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const section = item.getAttribute('data-section');
          this.showSection(section, item);
        });
      });
  
      // Logout
      document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.showPage('page-login');
        this.toast('Anda telah keluar', 'info');
      });
  
      // Date range
      document.getElementById('dateRange')?.addEventListener('change', (e) => {
        this.state.filters.dateRange = e.target.value;
        this.renderAll();
        this.toast(`Periode diubah ke ${e.target.options[e.target.selectedIndex].text}`, 'info');
      });
  
      // Top bar Import button
      document.getElementById('topImportBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const navItem = document.querySelector('.nav-item[data-section="ingestion"]');
        this.showSection('ingestion', navItem);
      });
  
      // Register / login switching
      document.getElementById('linkToRegister')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('page-register'); });
      document.getElementById('linkToLogin')?.addEventListener('click', (e) => { e.preventDefault(); this.showPage('page-login'); });
  
      // Transactions filters
      document.getElementById('filterChannel')?.addEventListener('change', (e) => {
        this.state.filters.channel = e.target.value;
        this.state.transactionsPage = 1;
        this.renderTransactions();
      });
      document.getElementById('filterType')?.addEventListener('change', (e) => {
        this.state.filters.type = e.target.value;
        this.state.transactionsPage = 1;
        this.renderTransactions();
      });
      document.getElementById('searchTx')?.addEventListener('input', (e) => {
        this.state.filters.search = e.target.value;
        this.state.transactionsPage = 1;
        this.renderTransactions();
      });
      document.getElementById('addTxBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const navItem = document.querySelector('.nav-item[data-section="ingestion"]');
        this.showSection('ingestion', navItem);
        document.getElementById('manualForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
  
      // Manual transaction form
      document.getElementById('manualForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleManualSubmit();
      });
  
      // Manual product change → autofill price
      document.getElementById('manualProductSelect')?.addEventListener('change', (e) => {
        const prod = this.productCatalog.find(p => p.name === e.target.value);
        if (prod) {
          const amountInput = document.getElementById('manualAmount');
          const qtyInput = document.getElementById('manualQty');
          if (amountInput && qtyInput) {
            amountInput.value = prod.price * Number(qtyInput.value || 1);
          }
        }
      });
      document.getElementById('manualQty')?.addEventListener('input', (e) => {
        const productName = document.getElementById('manualProductSelect')?.value;
        const prod = this.productCatalog.find(p => p.name === productName);
        const amountInput = document.getElementById('manualAmount');
        if (prod && amountInput) {
          amountInput.value = prod.price * Number(e.target.value || 1);
        }
      });
  
      // Goal
      document.getElementById('setGoalBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.openGoalDialog();
      });
      document.getElementById('goalForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const uplift = document.getElementById('goalUplift').value;
        const product = document.getElementById('goalProductSelect').value;
        const horizon = document.getElementById('goalHorizon').value;
        this.setGoal(uplift, product, horizon);
        this.closeGoalDialog();
      });
      document.getElementById('goalCancelBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeGoalDialog();
      });
      document.getElementById('goalClearBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearGoal();
        this.closeGoalDialog();
      });
  
      // Share Health Score
      document.getElementById('shareScoreBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleShareScore();
      });
  
      // Upload form
      document.getElementById('uploadZone')?.addEventListener('click', () => {
        document.getElementById('uploadFileInput')?.click();
      });
      document.getElementById('uploadFileInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const ut = document.getElementById('uploadZone')?.querySelector('.upload-text');
          if (ut) {
            ut.replaceChildren();
            const strong = document.createElement('strong');
            strong.textContent = file.name;
            ut.appendChild(strong);
            ut.appendChild(document.createTextNode(' siap di-upload'));
          }
        }
      });
      document.getElementById('uploadSubmitBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleUploadSubmit();
      });
    },
  
    handleManualSubmit() {
      const product = document.getElementById('manualProductSelect').value;
      const qty = Number(document.getElementById('manualQty').value);
      const amount = Number(document.getElementById('manualAmount').value);
      const date = document.getElementById('manualDate').value;
      const time = document.getElementById('manualTime').value;
      const channel = document.getElementById('manualChannel').value;
  
      if (!product || !date || !time || qty < 1 || amount <= 0) {
        this.toast('Lengkapi semua field dengan benar.', 'error');
        return;
      }
  
      const timestamp = new Date(`${date}T${time}:00`).toISOString();
      const id = this.makeRef(channel, new Date(timestamp), this.state.transactions.length + 1);
      const prod = this.productCatalog.find(p => p.name === product);
  
      const tx = {
        id,
        timestamp,
        product,
        unitPrice: prod ? prod.price : amount / qty,
        qty,
        amount,
        channel,
        type: 'sale',
      };
  
      this.state.transactions.unshift(tx);
      this.toast(`Transaksi ${product} sebesar ${this.fmtIDR(amount)} tercatat`, 'success');
      this.renderAll();
  
      // Reset form
      document.getElementById('manualQty').value = 1;
      const defaultProd = this.productCatalog[0];
      document.getElementById('manualAmount').value = defaultProd.price;
    },
  
    handleUploadSubmit() {
      const fileInput = document.getElementById('uploadFileInput');
      const channel = document.getElementById('uploadChannel').value;
      const file = fileInput?.files[0];
      const fileName = file ? file.name : 'sample.csv';
  
      // Simulate parsing: generate 8-20 random transactions in last 7 days
      const txCount = 8 + Math.floor(Math.random() * 13);
      const now = new Date();
      let added = 0, failed = 0;
      for (let i = 0; i < txCount; i++) {
        const offset = Math.floor(Math.random() * 7);
        const txDate = new Date(now);
        txDate.setDate(txDate.getDate() - offset);
        txDate.setHours(this.pickPeakHour(), Math.floor(Math.random() * 60), 0, 0);
        const product = this.productCatalog[Math.floor(Math.random() * this.productCatalog.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        const tx = {
          id: this.makeRef(channel, txDate, this.state.transactions.length + i + 1),
          timestamp: txDate.toISOString(),
          product: product.name,
          unitPrice: product.price,
          qty,
          amount: product.price * qty,
          channel,
          type: 'sale',
        };
        if (Math.random() < 0.05) { failed++; continue; }
        this.state.transactions.unshift(tx);
        added++;
      }
  
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
      const today = new Date();
      this.state.importHistory.unshift({
        date: `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`,
        file: fileName,
        channel,
        status: 'success',
        rows: txCount,
        success: added,
        failed,
      });
  
      this.toast(`Import selesai: ${added} transaksi ditambahkan${failed > 0 ? `, ${failed} gagal` : ''}`, 'success');
      this.renderAll();
  
      // Reset upload zone
      const zone = document.getElementById('uploadZone');
      if (zone) zone.querySelector('.upload-text').innerHTML = `<strong>Klik atau drag file</strong> untuk upload`;
      if (fileInput) fileInput.value = '';
    },
  
    /* ============== GOAL DIALOG ============== */
    openGoalDialog() {
      const dialog = document.getElementById('goalDialog');
      if (!dialog) return;
      // Populate product select
      const select = document.getElementById('goalProductSelect');
      if (select) {
        select.replaceChildren();
        this.productCatalog.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.name; opt.textContent = p.name;
          select.appendChild(opt);
        });
        if (this.state.goal) select.value = this.state.goal.targetProduct;
      }
      const upliftInput = document.getElementById('goalUplift');
      if (upliftInput) upliftInput.value = this.state.goal ? this.state.goal.upliftPct : 10;
      const horizonInput = document.getElementById('goalHorizon');
      if (horizonInput) horizonInput.value = this.state.goal ? this.state.goal.horizonDays : 30;
      const clearBtn = document.getElementById('goalClearBtn');
      if (clearBtn) clearBtn.style.display = this.state.goal ? '' : 'none';
      dialog.classList.add('show');
    },
  
    closeGoalDialog() {
      document.getElementById('goalDialog')?.classList.remove('show');
    },
  
    /* ============== TOAST ============== */
    toast(message, type = 'info') {
      let container = document.getElementById('toastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      const div = document.createElement('div');
      div.className = `toast toast-${type}`;
      div.textContent = message;
      container.appendChild(div);
      setTimeout(() => div.classList.add('show'), 10);
      setTimeout(() => {
        div.classList.remove('show');
        setTimeout(() => div.remove(), 300);
      }, 3000);
    },
  
    /* ============== INIT ============== */
    init() {
      this.generateMockTransactions();
      this.generateImportHistory();
      this.attachListeners();
      this.renderAll();
      this.applyUrlParams();
    },
  
    applyUrlParams() {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') {
        // Set a demo goal for richer dashboard
        this.setGoal(15, 'Nasi Bakar Ayam', 30);
      }
      if (params.get('login') === '1') {
        this.showPage('page-app');
      }
      const section = params.get('section');
      if (section) {
        const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
        this.showSection(section, navItem);
      }
    },
  };
  
  document.addEventListener('DOMContentLoaded', () => APP.init());
  
  // Expose globally for inline onclick handlers (login backward compat)
  window.APP = APP;
  window.showPage = (id) => APP.showPage(id);
  window.showSection = (id, navItem) => APP.showSection(id, navItem);
  window.handleLogin = (e) => { e.preventDefault(); APP.showPage('page-app'); APP.renderAll(); };
  
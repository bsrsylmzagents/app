# Test Planı - Raporlama Sistemi

## ✅ Tamamlanan Özellikler

### Backend Endpoint'leri
- ✅ `/api/reports/profit` - Kazanç (Kar/Zarar) Raporu
- ✅ `/api/reports/cash-flow` - Nakit Akış Raporu
- ✅ `/api/reports/customer-analysis` - Müşteri Analizi Raporu
- ✅ `/api/reports/income` - Gelir Raporu (geliştirilmiş)
- ✅ `/api/reports/expenses` - Gider Raporu (geliştirilmiş)
- ✅ `/api/reports/collections` - Tahsilat Raporu (geliştirilmiş)
- ✅ `/api/activity-logs` - Log Raporu (IP adresi ile)

### Frontend Sayfaları
- ✅ `/reports/profit` - Kazanç Raporu
- ✅ `/reports/cash-flow` - Nakit Akış Raporu
- ✅ `/reports/customer-analysis` - Müşteri Analizi Raporu
- ✅ `/reports/income` - Gelir Raporu
- ✅ `/reports/expenses` - Gider Raporu
- ✅ `/reports/collections` - Tahsilat Raporu
- ✅ `/reports/logs` - Log Raporu

---

## 🧪 Test Senaryoları

### 1. Backend Endpoint Testleri

#### 1.1 Profit Report Endpoint
- [ ] GET `/api/reports/profit` - Tüm parametrelerle
- [ ] GET `/api/reports/profit?date_from=2024-01-01&date_to=2024-12-31`
- [ ] GET `/api/reports/profit?currency=EUR`
- [ ] Response format kontrolü (total_income, total_expenses, profit, daily_trend)

#### 1.2 Cash Flow Report Endpoint
- [ ] GET `/api/reports/cash-flow` - Daily period
- [ ] GET `/api/reports/cash-flow?period=weekly`
- [ ] GET `/api/reports/cash-flow?period=monthly`
- [ ] GET `/api/reports/cash-flow?currency=TRY`
- [ ] Response format kontrolü (cash_flow, total_inflow, total_outflow, current_balances)

#### 1.3 Customer Analysis Report Endpoint
- [ ] GET `/api/reports/customer-analysis`
- [ ] GET `/api/reports/customer-analysis?min_sales=2`
- [ ] GET `/api/reports/customer-analysis?currency=USD`
- [ ] Response format kontrolü (total_customers, returning_customers, customers list)

#### 1.4 Enhanced Reports Endpoints
- [ ] GET `/api/reports/income?income_category_id=xxx&user_id=xxx&cari_id=xxx`
- [ ] GET `/api/reports/expenses?user_id=xxx&cari_id=xxx`
- [ ] GET `/api/reports/collections?cari_id=xxx&user_id=xxx`
- [ ] GET `/api/activity-logs?ip_address=xxx`

---

### 2. Frontend Sayfa Testleri

#### 2.1 Sayfa Erişimi
- [ ] `/reports` sayfası açılıyor mu?
- [ ] Tüm rapor menü kartları görünüyor mu?
- [ ] Her rapor sayfasına navigasyon çalışıyor mu?

#### 2.2 Kazanç Raporu (`/reports/profit`)
- [ ] Sayfa yükleniyor mu?
- [ ] Veri çekiliyor mu?
- [ ] Özet kartlar görünüyor mu? (Toplam Gelir, Toplam Gider, Kar/Zarar)
- [ ] Grafikler render ediliyor mu?
  - [ ] Pie Chart (Kar/Zarar Dağılımı)
  - [ ] Bar Chart (Gelir vs Gider vs Kar)
  - [ ] Line Chart (Günlük Kar/Zarar Trendi)
- [ ] Filtreler çalışıyor mu? (Tarih, Döviz)
- [ ] PDF export çalışıyor mu?
- [ ] XML export çalışıyor mu?

#### 2.3 Nakit Akış Raporu (`/reports/cash-flow`)
- [ ] Sayfa yükleniyor mu?
- [ ] Veri çekiliyor mu?
- [ ] Özet kartlar görünüyor mu? (Toplam Giriş, Toplam Çıkış, Net Akış, Mevcut Bakiye)
- [ ] Grafikler render ediliyor mu?
  - [ ] Stacked Bar Chart (Giriş vs Çıkış)
  - [ ] Area Chart (Net Akış Trendi)
  - [ ] Line Chart (Bakiye Trendi)
- [ ] Filtreler çalışıyor mu? (Tarih, Döviz, Period: Daily/Weekly/Monthly)
- [ ] PDF export çalışıyor mu?
- [ ] XML export çalışıyor mu?
- [ ] CSV export çalışıyor mu?

#### 2.4 Müşteri Analizi Raporu (`/reports/customer-analysis`)
- [ ] Sayfa yükleniyor mu?
- [ ] Veri çekiliyor mu?
- [ ] Özet kartlar görünüyor mu? (Toplam Müşteri, Tekrar Eden, Yeni)
- [ ] Grafikler render ediliyor mu?
  - [ ] Pie Chart (Müşteri Tipi Dağılımı)
  - [ ] Pie Chart (Para Birimine Göre Gelir)
  - [ ] Bar Chart (En Çok Gelir Getiren 10 Müşteri)
- [ ] Müşteri tablosu görünüyor mu?
- [ ] Filtreler çalışıyor mu? (Tarih, Döviz, Min Satış)
- [ ] PDF export çalışıyor mu?
- [ ] XML export çalışıyor mu?
- [ ] CSV export çalışıyor mu?

#### 2.5 Geliştirilmiş Gelir Raporu (`/reports/income`)
- [ ] Yeni filtreler çalışıyor mu? (Gelir Kategorisi, Kullanıcı, Cari Hesap)
- [ ] Kategori Bazlı Gelir tablosu görünüyor mu?
- [ ] Detaylı Gelir Listesi tablosu görünüyor mu?
- [ ] CSV export çalışıyor mu?
- [ ] Grafikler render ediliyor mu?

#### 2.6 Geliştirilmiş Gider Raporu (`/reports/expenses`)
- [ ] Yeni filtreler çalışıyor mu? (Kullanıcı, Cari Hesap)
- [ ] Cari Hesaba Göre Giderler tablosu görünüyor mu?
- [ ] Detaylı Gider Listesi tablosu görünüyor mu?
- [ ] CSV export çalışıyor mu?
- [ ] Grafikler render ediliyor mu?

#### 2.7 Geliştirilmiş Tahsilat Raporu (`/reports/collections`)
- [ ] Yeni filtreler çalışıyor mu? (Cari Hesap, Kullanıcı)
- [ ] Cari Hesaba Göre Tahsilatlar tablosu görünüyor mu?
- [ ] Detaylı Tahsilat Listesi tablosu görünüyor mu? (time, cari_name, user_name dahil)
- [ ] CSV export çalışıyor mu?
- [ ] Grafikler render ediliyor mu?

#### 2.8 Geliştirilmiş Log Raporu (`/reports/logs`)
- [ ] IP adresi filtresi çalışıyor mu?
- [ ] IP adresi sütunu görünüyor mu?
- [ ] Özet istatistik kartları görünüyor mu?
- [ ] Sayfalama çalışıyor mu?
- [ ] Detaylı log görüntüleme (expandable rows) çalışıyor mu?
- [ ] CSV export çalışıyor mu?
- [ ] Grafikler kaldırıldı mı? (Grafik olmamalı)

---

### 3. Filtreleme Testleri

#### 3.1 Tarih Filtreleri
- [ ] Tüm raporlarda `date_from` filtresi çalışıyor mu?
- [ ] Tüm raporlarda `date_to` filtresi çalışıyor mu?
- [ ] Tarih aralığı seçildiğinde veri doğru filtreleniyor mu?

#### 3.2 Döviz Filtreleri
- [ ] Tüm raporlarda `currency` filtresi çalışıyor mu?
- [ ] EUR, USD, TRY filtreleri doğru çalışıyor mu?

#### 3.3 Özel Filtreler
- [ ] Gelir Raporu: `income_category_id`, `user_id`, `cari_id`
- [ ] Gider Raporu: `user_id`, `cari_id`
- [ ] Tahsilat Raporu: `cari_id`, `user_id`
- [ ] Log Raporu: `ip_address`
- [ ] Müşteri Analizi: `min_sales`
- [ ] Nakit Akış: `period` (daily/weekly/monthly)

---

### 4. Export Fonksiyonları Testleri

#### 4.1 PDF Export
- [ ] Tüm raporlarda PDF export butonu var mı?
- [ ] PDF dosyası indiriliyor mu?
- [ ] PDF içeriği doğru mu? (Başlık, tarih, veriler, tablolar)
- [ ] PDF'de grafikler var mı? (Gerekli raporlarda)

#### 4.2 XML Export
- [ ] Tüm raporlarda XML export butonu var mı?
- [ ] XML dosyası indiriliyor mu?
- [ ] XML formatı doğru mu? (Header, data, footer)
- [ ] XML'de filtre bilgileri var mı?

#### 4.3 CSV Export
- [ ] CSV export butonu olan raporlarda çalışıyor mu?
  - [ ] Nakit Akış Raporu
  - [ ] Müşteri Analizi Raporu
  - [ ] Gelir Raporu
  - [ ] Gider Raporu
  - [ ] Tahsilat Raporu
  - [ ] Log Raporu
- [ ] CSV dosyası indiriliyor mu?
- [ ] CSV formatı doğru mu? (Header, data rows)

---

### 5. Grafik Testleri

#### 5.1 Recharts Kütüphanesi
- [ ] Recharts import edilmiş mi?
- [ ] Tüm grafik tipleri render ediliyor mu?
  - [ ] PieChart
  - [ ] BarChart
  - [ ] LineChart
  - [ ] AreaChart
- [ ] Grafikler responsive mi?
- [ ] Grafikler veri gösteriyor mu?

#### 5.2 Grafik Verileri
- [ ] Boş veri durumunda grafikler hata vermiyor mu?
- [ ] Grafik tooltip'leri çalışıyor mu?
- [ ] Grafik legend'leri görünüyor mu?

---

### 6. IP Adresi Takibi Testi

#### 6.1 Backend IP Takibi
- [ ] `get_client_ip` fonksiyonu çalışıyor mu?
- [ ] `get_current_user` IP adresini alıyor mu?
- [ ] `create_activity_log` IP adresini kaydediyor mu?
- [ ] Activity log'larda `ip_address` field'ı var mı?

#### 6.2 Frontend IP Görüntüleme
- [ ] Log raporunda IP adresi sütunu görünüyor mu?
- [ ] IP adresi filtresi çalışıyor mu?
- [ ] PDF export'ta IP adresi var mı?

---

### 7. Mevcut Fonksiyonlar Testi (Regression)

#### 7.1 Temel Özellikler
- [ ] Rezervasyon oluşturma çalışıyor mu?
- [ ] Cari hesap işlemleri çalışıyor mu?
- [ ] Kasa işlemleri çalışıyor mu?
- [ ] Gelir/Gider ekleme çalışıyor mu?
- [ ] Tahsilat ekleme çalışıyor mu?

#### 7.2 Münferit Cari
- [ ] Münferit cari otomatik oluşturuluyor mu?
- [ ] Münferit cari silinemiyor mu?
- [ ] Münferit cari müşteriler sekmesi çalışıyor mu?

---

## 🐛 Bilinen Sorunlar

Şu anda bilinen bir sorun yok.

---

## 📝 Test Notları

### Test Ortamı
- Backend: FastAPI (Python)
- Frontend: React
- Database: MongoDB
- Grafik Kütüphanesi: Recharts
- PDF: jsPDF + jsPDF-AutoTable
- XML: Custom utility
- CSV: Custom utility

### Test Verileri
- Test için yeterli veri olduğundan emin olun
- Farklı döviz tiplerinde veri olmalı
- Farklı tarih aralıklarında veri olmalı
- Müşteri verileri olmalı (rezervasyon + extra sales)

---

## ✅ Test Sonuçları

Test sonuçlarını buraya kaydedin:

- [ ] Tüm testler başarılı
- [ ] Bazı testler başarısız (detaylar aşağıda)
- [ ] Test edilmedi

### Başarısız Testler
1. ...
2. ...

### Notlar
...




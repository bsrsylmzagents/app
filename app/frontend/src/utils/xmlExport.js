/**
 * XML Export Utility Functions
 * Tüm raporlar için XML export fonksiyonları
 */

/**
 * XML string'ini escape eder (XML güvenli karakterler)
 */
const escapeXml = (text) => {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * XML header'ı oluşturur
 */
const createXmlHeader = (title, filters = {}) => {
  const companyInfo = getCompanyInfo();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<report>
  <header>
    <title>${escapeXml(title)}</title>
    <company>
      <name>${escapeXml(companyInfo.name)}</name>
      <phone>${escapeXml(companyInfo.phone)}</phone>
      <address>${escapeXml(companyInfo.address)}</address>
      <email>${escapeXml(companyInfo.email)}</email>
    </company>
    <generated>
      <date>${dateStr}</date>
      <time>${timeStr}</time>
    </generated>
    ${filters.date_from ? `<filter_date_from>${escapeXml(filters.date_from)}</filter_date_from>` : ''}
    ${filters.date_to ? `<filter_date_to>${escapeXml(filters.date_to)}</filter_date_to>` : ''}
    ${filters.currency ? `<filter_currency>${escapeXml(filters.currency)}</filter_currency>` : ''}
    ${filters.tour_type_id ? `<filter_tour_type_id>${escapeXml(filters.tour_type_id)}</filter_tour_type_id>` : ''}
    ${filters.expense_category_id ? `<filter_expense_category_id>${escapeXml(filters.expense_category_id)}</filter_expense_category_id>` : ''}
    ${filters.payment_type_id ? `<filter_payment_type_id>${escapeXml(filters.payment_type_id)}</filter_payment_type_id>` : ''}
    ${filters.user_id ? `<filter_user_id>${escapeXml(filters.user_id)}</filter_user_id>` : ''}
    ${filters.action ? `<filter_action>${escapeXml(filters.action)}</filter_action>` : ''}
    ${filters.ip_address ? `<filter_ip_address>${escapeXml(filters.ip_address)}</filter_ip_address>` : ''}
  </header>
  <data>`;
};

/**
 * XML footer'ı oluşturur
 */
const createXmlFooter = (summary = {}) => {
  let summaryXml = '';
  if (Object.keys(summary).length > 0) {
    summaryXml = '\n  <summary>';
    for (const [key, value] of Object.entries(summary)) {
      if (typeof value === 'object' && value !== null) {
        summaryXml += `\n    <${key}>`;
        for (const [subKey, subValue] of Object.entries(value)) {
          summaryXml += `\n      <${subKey}>${escapeXml(subValue)}</${subKey}>`;
        }
        summaryXml += `\n    </${key}>`;
      } else {
        summaryXml += `\n    <${key}>${escapeXml(value)}</${key}>`;
      }
    }
    summaryXml += '\n  </summary>';
  }
  
  return `${summaryXml}
  </data>
</report>`;
};

/**
 * Firma bilgilerini localStorage'dan al
 */
const getCompanyInfo = () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const company = JSON.parse(localStorage.getItem('company') || '{}');
    return {
      name: company.name || userInfo.company_name || 'Firma Adı',
      phone: company.phone || userInfo.company_phone || '',
      address: company.address || userInfo.company_address || '',
      email: company.email || userInfo.company_email || '',
      website: company.website || userInfo.company_website || ''
    };
  } catch {
    return {
      name: 'Firma Adı',
      phone: '',
      address: '',
      email: '',
      website: ''
    };
  }
};

/**
 * XML dosyasını indirir
 */
export const downloadXml = (xmlContent, filename) => {
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Gelir Raporu için XML oluşturur
 */
export const generateIncomeXml = (reportData, filters) => {
  let xml = createXmlHeader('Gelir Raporu', filters);
  
  // Özet
  const summary = {
    total_revenue: {
      EUR: reportData.total_revenue?.EUR || 0,
      USD: reportData.total_revenue?.USD || 0,
      TRY: reportData.total_revenue?.TRY || 0
    }
  };
  
  // Tur Tipi İstatistikleri
  if (reportData.tour_type_stats && reportData.tour_type_stats.length > 0) {
    xml += '\n    <tour_type_statistics>';
    reportData.tour_type_stats.forEach(stat => {
      xml += `\n      <tour_type>
        <name>${escapeXml(stat.tour_type_name || '-')}</name>
        <reservation_count>${stat.reservation_count || 0}</reservation_count>
        <revenue>
          <EUR>${stat.revenue?.EUR || 0}</EUR>
          <USD>${stat.revenue?.USD || 0}</USD>
          <TRY>${stat.revenue?.TRY || 0}</TRY>
        </revenue>
      </tour_type>`;
    });
    xml += '\n    </tour_type_statistics>';
  }
  
  // Günlük Trend
  if (reportData.daily_trend) {
    xml += '\n    <daily_trend>';
    Object.entries(reportData.daily_trend).forEach(([date, amounts]) => {
      xml += `\n      <day>
        <date>${escapeXml(date)}</date>
        <EUR>${amounts.EUR || 0}</EUR>
        <USD>${amounts.USD || 0}</USD>
        <TRY>${amounts.TRY || 0}</TRY>
      </day>`;
    });
    xml += '\n    </daily_trend>';
  }
  
  xml += createXmlFooter(summary);
  return xml;
};

/**
 * Gider Raporu için XML oluşturur
 */
export const generateExpensesXml = (reportData, filters) => {
  let xml = createXmlHeader('Gider / Masraf Raporu', filters);
  
  // Özet
  const summary = {
    total_expenses: {
      EUR: reportData.total_expenses?.EUR || 0,
      USD: reportData.total_expenses?.USD || 0,
      TRY: reportData.total_expenses?.TRY || 0
    }
  };
  
  // Gider Kategorileri
  if (reportData.category_totals && reportData.category_totals.length > 0) {
    xml += '\n    <expense_categories>';
    reportData.category_totals.forEach(cat => {
      xml += `\n      <category>
        <name>${escapeXml(cat.category_name || '-')}</name>
        <totals>
          <EUR>${cat.totals?.EUR || 0}</EUR>
          <USD>${cat.totals?.USD || 0}</USD>
          <TRY>${cat.totals?.TRY || 0}</TRY>
        </totals>
      </category>`;
    });
    xml += '\n    </expense_categories>';
  }
  
  // Gider Listesi
  if (reportData.expenses && reportData.expenses.length > 0) {
    xml += '\n    <expenses>';
    reportData.expenses.forEach(expense => {
      xml += `\n      <expense>
        <id>${escapeXml(expense.id || '')}</id>
        <date>${escapeXml(expense.date || '')}</date>
        <description>${escapeXml(expense.description || '')}</description>
        <category_id>${escapeXml(expense.expense_category_id || '')}</category_id>
        <amount>${expense.amount || 0}</amount>
        <currency>${escapeXml(expense.currency || 'EUR')}</currency>
        <exchange_rate>${expense.exchange_rate || 1.0}</exchange_rate>
      </expense>`;
    });
    xml += '\n    </expenses>';
  }
  
  // Günlük Trend
  if (reportData.daily_trend) {
    xml += '\n    <daily_trend>';
    Object.entries(reportData.daily_trend).forEach(([date, amounts]) => {
      xml += `\n      <day>
        <date>${escapeXml(date)}</date>
        <EUR>${amounts.EUR || 0}</EUR>
        <USD>${amounts.USD || 0}</USD>
        <TRY>${amounts.TRY || 0}</TRY>
      </day>`;
    });
    xml += '\n    </daily_trend>';
  }
  
  xml += createXmlFooter(summary);
  return xml;
};

/**
 * Tahsilat Raporu için XML oluşturur
 */
export const generateCollectionsXml = (reportData, filters) => {
  let xml = createXmlHeader('Tahsilat Raporu', filters);
  
  // Özet
  const summary = {
    total_collections: {
      EUR: reportData.collections?.EUR || 0,
      USD: reportData.collections?.USD || 0,
      TRY: reportData.collections?.TRY || 0
    }
  };
  
  // Ödeme Tipi İstatistikleri
  if (reportData.payment_type_stats && reportData.payment_type_stats.length > 0) {
    xml += '\n    <payment_type_statistics>';
    reportData.payment_type_stats.forEach(stat => {
      xml += `\n      <payment_type>
        <name>${escapeXml(stat.payment_type_name || '-')}</name>
        <transaction_count>${stat.transaction_count || 0}</transaction_count>
        <totals>
          <EUR>${stat.totals?.EUR || 0}</EUR>
          <USD>${stat.totals?.USD || 0}</USD>
          <TRY>${stat.totals?.TRY || 0}</TRY>
        </totals>
      </payment_type>`;
    });
    xml += '\n    </payment_type_statistics>';
  }
  
  // İşlem Listesi
  if (reportData.transactions && reportData.transactions.length > 0) {
    xml += '\n    <transactions>';
    reportData.transactions.forEach(transaction => {
      xml += `\n      <transaction>
        <id>${escapeXml(transaction.id || '')}</id>
        <date>${escapeXml(transaction.date || '')}</date>
        <description>${escapeXml(transaction.description || '')}</description>
        <payment_type_id>${escapeXml(transaction.payment_type_id || '')}</payment_type_id>
        <payment_type_name>${escapeXml(transaction.payment_type_name || '')}</payment_type_name>
        <amount>${transaction.amount || 0}</amount>
        <currency>${escapeXml(transaction.currency || 'EUR')}</currency>
        <exchange_rate>${transaction.exchange_rate || 1.0}</exchange_rate>
      </transaction>`;
    });
    xml += '\n    </transactions>';
  }
  
  // Günlük Trend
  if (reportData.daily_trend) {
    xml += '\n    <daily_trend>';
    Object.entries(reportData.daily_trend).forEach(([date, amounts]) => {
      xml += `\n      <day>
        <date>${escapeXml(date)}</date>
        <EUR>${amounts.EUR || 0}</EUR>
        <USD>${amounts.USD || 0}</USD>
        <TRY>${amounts.TRY || 0}</TRY>
      </day>`;
    });
    xml += '\n    </daily_trend>';
  }
  
  xml += createXmlFooter(summary);
  return xml;
};

/**
 * Log Raporu için XML oluşturur
 */
export const generateLogsXml = (logs, filters) => {
  let xml = createXmlHeader('Sistem Logları', filters);
  
  // Özet
  const summary = {
    total_logs: logs.length,
    unique_users: new Set(logs.map(log => log.user_id)).size,
    unique_ips: new Set(logs.map(log => log.ip_address).filter(ip => ip)).size
  };
  
  // Log Listesi
  xml += '\n    <logs>';
  logs.forEach(log => {
    xml += `\n      <log>
        <id>${escapeXml(log.id || '')}</id>
        <created_at>${escapeXml(log.created_at || '')}</created_at>
        <user_id>${escapeXml(log.user_id || '')}</user_id>
        <username>${escapeXml(log.username || '')}</username>
        <full_name>${escapeXml(log.full_name || '')}</full_name>
        <ip_address>${escapeXml(log.ip_address || '')}</ip_address>
        <action>${escapeXml(log.action || '')}</action>
        <entity_type>${escapeXml(log.entity_type || '')}</entity_type>
        <entity_id>${escapeXml(log.entity_id || '')}</entity_id>
        <entity_name>${escapeXml(log.entity_name || '')}</entity_name>
        <description>${escapeXml(log.description || '')}</description>
      </log>`;
  });
  xml += '\n    </logs>';
  
  xml += createXmlFooter(summary);
  return xml;
};

/**
 * Genel XML oluşturucu (özel raporlar için)
 */
export const generateGenericXml = (title, data, filters = {}) => {
  let xml = createXmlHeader(title, filters);
  
  // Veriyi recursive olarak XML'e çevir
  const convertToXml = (obj, indent = '    ') => {
    if (Array.isArray(obj)) {
      return obj.map(item => convertToXml(item, indent)).join('\n');
    } else if (typeof obj === 'object' && obj !== null) {
      let result = '';
      for (const [key, value] of Object.entries(obj)) {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result += `\n${indent}<${safeKey}>${convertToXml(value, indent + '  ')}\n${indent}</${safeKey}>`;
        } else if (Array.isArray(value)) {
          result += `\n${indent}<${safeKey}>`;
          value.forEach(item => {
            result += convertToXml(item, indent + '  ');
          });
          result += `\n${indent}</${safeKey}>`;
        } else {
          result += `\n${indent}<${safeKey}>${escapeXml(value)}</${safeKey}>`;
        }
      }
      return result;
    } else {
      return `${indent}${escapeXml(obj)}`;
    }
  };
  
  xml += convertToXml(data, '    ');
  xml += createXmlFooter();
  return xml;
};




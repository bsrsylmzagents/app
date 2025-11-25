# Recharts Paketi Yükleme

`recharts` paketi `package.json` dosyasında tanımlı ancak `node_modules` klasöründe yüklü değil.

## Çözüm

Frontend klasöründe aşağıdaki komutlardan birini çalıştırın:

### npm kullanıyorsanız:
```bash
cd app/frontend
npm install
```

veya sadece recharts için:
```bash
cd app/frontend
npm install recharts
```

### yarn kullanıyorsanız:
```bash
cd app/frontend
yarn install
```

veya sadece recharts için:
```bash
cd app/frontend
yarn add recharts
```

## Not

PowerShell execution policy hatası alıyorsanız, PowerShell'i yönetici olarak açıp şu komutu çalıştırın:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Sonra tekrar `npm install` veya `yarn install` komutunu çalıştırın.




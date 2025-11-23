import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Ülke kodları listesi - Unique hale getirilmiş
const ALL_COUNTRIES = [
  { code: 'TR', name: 'Türkiye' },
  { code: 'TC', name: 'Türkiye' }, // TC kodu da ekleniyor
  { code: 'DE', name: 'Almanya' },
  { code: 'US', name: 'ABD' },
  { code: 'GB', name: 'İngiltere' },
  { code: 'FR', name: 'Fransa' },
  { code: 'IT', name: 'İtalya' },
  { code: 'ES', name: 'İspanya' },
  { code: 'NL', name: 'Hollanda' },
  { code: 'BE', name: 'Belçika' },
  { code: 'AT', name: 'Avusturya' },
  { code: 'CH', name: 'İsviçre' },
  { code: 'GR', name: 'Yunanistan' },
  { code: 'RU', name: 'Rusya' },
  { code: 'PL', name: 'Polonya' },
  { code: 'CZ', name: 'Çek Cumhuriyeti' },
  { code: 'SE', name: 'İsveç' },
  { code: 'NO', name: 'Norveç' },
  { code: 'DK', name: 'Danimarka' },
  { code: 'FI', name: 'Finlandiya' },
  { code: 'IE', name: 'İrlanda' },
  { code: 'PT', name: 'Portekiz' },
  { code: 'AU', name: 'Avustralya' },
  { code: 'CA', name: 'Kanada' },
  { code: 'JP', name: 'Japonya' },
  { code: 'CN', name: 'Çin' },
  { code: 'IN', name: 'Hindistan' },
  { code: 'BR', name: 'Brezilya' },
  { code: 'MX', name: 'Meksika' },
  { code: 'AR', name: 'Arjantin' },
  { code: 'ZA', name: 'Güney Afrika' },
  { code: 'EG', name: 'Mısır' },
  { code: 'AE', name: 'Birleşik Arap Emirlikleri' },
  { code: 'SA', name: 'Suudi Arabistan' },
  { code: 'IL', name: 'İsrail' },
  { code: 'KR', name: 'Güney Kore' },
  { code: 'SG', name: 'Singapur' },
  { code: 'TH', name: 'Tayland' },
  { code: 'MY', name: 'Malezya' },
  { code: 'ID', name: 'Endonezya' },
  { code: 'PH', name: 'Filipinler' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'NZ', name: 'Yeni Zelanda' },
  { code: 'CL', name: 'Şili' },
  { code: 'CO', name: 'Kolombiya' },
  { code: 'PE', name: 'Peru' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Ekvador' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivya' },
  { code: 'CR', name: 'Kosta Rika' },
  { code: 'PA', name: 'Panama' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'NI', name: 'Nikaragua' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'DO', name: 'Dominik Cumhuriyeti' },
  { code: 'CU', name: 'Küba' },
  { code: 'JM', name: 'Jamaika' },
  { code: 'TT', name: 'Trinidad ve Tobago' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BS', name: 'Bahamalar' },
  { code: 'AG', name: 'Antigua ve Barbuda' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent ve Grenadinler' },
  { code: 'GD', name: 'Grenada' },
  { code: 'DM', name: 'Dominika' },
  { code: 'KN', name: 'Saint Kitts ve Nevis' },
  { code: 'BZ', name: 'Belize' },
  { code: 'GY', name: 'Guyana' },
  { code: 'SR', name: 'Surinam' },
  { code: 'GF', name: 'Fransız Guyanası' },
  { code: 'FK', name: 'Falkland Adaları' },
  { code: 'GS', name: 'Güney Georgia ve Güney Sandwich Adaları' },
  { code: 'AI', name: 'Anguilla' },
  { code: 'VG', name: 'Britanya Virjin Adaları' },
  { code: 'VI', name: 'ABD Virjin Adaları' },
  { code: 'PR', name: 'Porto Riko' },
  { code: 'GP', name: 'Guadeloupe' },
  { code: 'MQ', name: 'Martinik' },
  { code: 'CW', name: 'Curaçao' },
  { code: 'AW', name: 'Aruba' },
  { code: 'SX', name: 'Sint Maarten' },
  { code: 'BQ', name: 'Karayip Hollandası' },
  { code: 'KY', name: 'Cayman Adaları' },
  { code: 'TCA', name: 'Turks ve Caicos Adaları' }, // TCA olarak değiştirildi
  { code: 'BM', name: 'Bermuda' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'PM', name: 'Saint Pierre ve Miquelon' },
  { code: 'GL', name: 'Grönland' },
  { code: 'FO', name: 'Faroe Adaları' },
  { code: 'IS', name: 'İzlanda' },
  { code: 'AX', name: 'Åland Adaları' },
  { code: 'SJ', name: 'Svalbard ve Jan Mayen' },
  { code: 'GG', name: 'Guernsey' },
  { code: 'JE', name: 'Jersey' },
  { code: 'IM', name: 'Man Adası' },
  { code: 'GI', name: 'Cebelitarık' },
  { code: 'AD', name: 'Andorra' },
  { code: 'MC', name: 'Monako' },
  { code: 'SM', name: 'San Marino' },
  { code: 'VA', name: 'Vatikan' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'MT', name: 'Malta' },
  { code: 'CY', name: 'Kıbrıs' },
  { code: 'LU', name: 'Lüksemburg' },
  { code: 'EE', name: 'Estonya' },
  { code: 'LV', name: 'Letonya' },
  { code: 'LT', name: 'Litvanya' },
  { code: 'SK', name: 'Slovakya' },
  { code: 'SI', name: 'Slovenya' },
  { code: 'HR', name: 'Hırvatistan' },
  { code: 'BA', name: 'Bosna Hersek' },
  { code: 'RS', name: 'Sırbistan' },
  { code: 'ME', name: 'Karadağ' },
  { code: 'MK', name: 'Kuzey Makedonya' },
  { code: 'AL', name: 'Arnavutluk' },
  { code: 'XK', name: 'Kosova' },
  { code: 'MD', name: 'Moldova' },
  { code: 'UA', name: 'Ukrayna' },
  { code: 'BY', name: 'Belarus' },
  { code: 'RO', name: 'Romanya' },
  { code: 'BG', name: 'Bulgaristan' },
  { code: 'HU', name: 'Macaristan' },
  { code: 'IE', name: 'İrlanda' },
  { code: 'IS', name: 'İzlanda' },
  { code: 'NO', name: 'Norveç' },
  { code: 'SE', name: 'İsveç' },
  { code: 'FI', name: 'Finlandiya' },
  { code: 'DK', name: 'Danimarka' },
  { code: 'PL', name: 'Polonya' },
  { code: 'CZ', name: 'Çek Cumhuriyeti' },
  { code: 'SK', name: 'Slovakya' },
  { code: 'AT', name: 'Avusturya' },
  { code: 'CH', name: 'İsviçre' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'DE', name: 'Almanya' },
  { code: 'NL', name: 'Hollanda' },
  { code: 'BE', name: 'Belçika' },
  { code: 'LU', name: 'Lüksemburg' },
  { code: 'FR', name: 'Fransa' },
  { code: 'ES', name: 'İspanya' },
  { code: 'PT', name: 'Portekiz' },
  { code: 'IT', name: 'İtalya' },
  { code: 'GR', name: 'Yunanistan' },
  { code: 'MT', name: 'Malta' },
  { code: 'CY', name: 'Kıbrıs' },
  { code: 'GB', name: 'İngiltere' },
  { code: 'IE', name: 'İrlanda' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'RU', name: 'Rusya' },
  { code: 'UA', name: 'Ukrayna' },
  { code: 'BY', name: 'Belarus' },
  { code: 'MD', name: 'Moldova' },
  { code: 'RO', name: 'Romanya' },
  { code: 'BG', name: 'Bulgaristan' },
  { code: 'RS', name: 'Sırbistan' },
  { code: 'HR', name: 'Hırvatistan' },
  { code: 'BA', name: 'Bosna Hersek' },
  { code: 'ME', name: 'Karadağ' },
  { code: 'MK', name: 'Kuzey Makedonya' },
  { code: 'AL', name: 'Arnavutluk' },
  { code: 'XK', name: 'Kosova' },
  { code: 'SI', name: 'Slovenya' },
  { code: 'HU', name: 'Macaristan' },
  { code: 'SK', name: 'Slovakya' },
  { code: 'CZ', name: 'Çek Cumhuriyeti' },
  { code: 'PL', name: 'Polonya' },
  { code: 'EE', name: 'Estonya' },
  { code: 'LV', name: 'Letonya' },
  { code: 'LT', name: 'Litvanya' },
  { code: 'FI', name: 'Finlandiya' },
  { code: 'SE', name: 'İsveç' },
  { code: 'NO', name: 'Norveç' },
  { code: 'DK', name: 'Danimarka' },
  { code: 'IS', name: 'İzlanda' },
  { code: 'JP', name: 'Japonya' },
  { code: 'CN', name: 'Çin' },
  { code: 'KR', name: 'Güney Kore' },
  { code: 'TW', name: 'Tayvan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'MO', name: 'Makao' },
  { code: 'SG', name: 'Singapur' },
  { code: 'MY', name: 'Malezya' },
  { code: 'TH', name: 'Tayland' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Filipinler' },
  { code: 'ID', name: 'Endonezya' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'KH', name: 'Kamboçya' },
  { code: 'LA', name: 'Laos' },
  { code: 'BN', name: 'Brunei' },
  { code: 'TL', name: 'Doğu Timor' },
  { code: 'BD', name: 'Bangladeş' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'MV', name: 'Maldivler' },
  { code: 'NP', name: 'Nepal' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'AF', name: 'Afganistan' },
  { code: 'IR', name: 'İran' },
  { code: 'IQ', name: 'Irak' },
  { code: 'SY', name: 'Suriye' },
  { code: 'LB', name: 'Lübnan' },
  { code: 'JO', name: 'Ürdün' },
  { code: 'PS', name: 'Filistin' },
  { code: 'IL', name: 'İsrail' },
  { code: 'YE', name: 'Yemen' },
  { code: 'OM', name: 'Umman' },
  { code: 'AE', name: 'Birleşik Arap Emirlikleri' },
  { code: 'QA', name: 'Katar' },
  { code: 'BH', name: 'Bahreyn' },
  { code: 'KW', name: 'Kuveyt' },
  { code: 'SA', name: 'Suudi Arabistan' },
  { code: 'EG', name: 'Mısır' },
  { code: 'SD', name: 'Sudan' },
  { code: 'ET', name: 'Etiyopya' },
  { code: 'ER', name: 'Eritre' },
  { code: 'DJ', name: 'Cibuti' },
  { code: 'SO', name: 'Somali' },
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzanya' },
  { code: 'RW', name: 'Ruanda' },
  { code: 'BI', name: 'Burundi' },
  { code: 'SS', name: 'Güney Sudan' },
  { code: 'CF', name: 'Orta Afrika Cumhuriyeti' },
  { code: 'TD', name: 'Çad' },
  { code: 'CM', name: 'Kamerun' },
  { code: 'GQ', name: 'Ekvator Ginesi' },
  { code: 'GA', name: 'Gabon' },
  { code: 'CG', name: 'Kongo' },
  { code: 'CD', name: 'Demokratik Kongo Cumhuriyeti' },
  { code: 'AO', name: 'Angola' },
  { code: 'ZM', name: 'Zambiya' },
  { code: 'ZW', name: 'Zimbabve' },
  { code: 'BW', name: 'Botsvana' },
  { code: 'NA', name: 'Namibya' },
  { code: 'ZA', name: 'Güney Afrika' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'SZ', name: 'Esvati' },
  { code: 'MW', name: 'Malavi' },
  { code: 'MZ', name: 'Mozambik' },
  { code: 'MG', name: 'Madagaskar' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'SC', name: 'Seyşeller' },
  { code: 'KM', name: 'Komorlar' },
  { code: 'YT', name: 'Mayotte' },
  { code: 'RE', name: 'Réunion' },
  { code: 'TF', name: 'Fransız Güney Toprakları' },
  { code: 'SH', name: 'Saint Helena' },
  { code: 'ST', name: 'São Tomé ve Príncipe' },
  { code: 'CV', name: 'Yeşil Burun Adaları' },
  { code: 'GW', name: 'Gine-Bissau' },
  { code: 'GN', name: 'Gine' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'LR', name: 'Liberya' },
  { code: 'CI', name: 'Fildişi Sahili' },
  { code: 'GH', name: 'Gana' },
  { code: 'TG', name: 'Togo' },
  { code: 'BJ', name: 'Benin' },
  { code: 'NE', name: 'Nijer' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'ML', name: 'Mali' },
  { code: 'SN', name: 'Senegal' },
  { code: 'GM', name: 'Gambiya' },
  { code: 'MR', name: 'Moritanya' },
  { code: 'DZ', name: 'Cezayir' },
  { code: 'TN', name: 'Tunus' },
  { code: 'LY', name: 'Libya' },
  { code: 'MA', name: 'Fas' },
  { code: 'EH', name: 'Batı Sahra' },
  { code: 'AU', name: 'Avustralya' },
  { code: 'NZ', name: 'Yeni Zelanda' },
  { code: 'PG', name: 'Papua Yeni Gine' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'NC', name: 'Yeni Kaledonya' },
  { code: 'PF', name: 'Fransız Polinezyası' },
  { code: 'WS', name: 'Samoa' },
  { code: 'TO', name: 'Tonga' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'SB', name: 'Solomon Adaları' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'NR', name: 'Nauru' },
  { code: 'PW', name: 'Palau' },
  { code: 'FM', name: 'Mikronezya' },
  { code: 'MH', name: 'Marshall Adaları' },
  { code: 'AS', name: 'Amerikan Samoası' },
  { code: 'GU', name: 'Guam' },
  { code: 'MP', name: 'Kuzey Mariana Adaları' },
  { code: 'CK', name: 'Cook Adaları' },
  { code: 'NU', name: 'Niue' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'PN', name: 'Pitcairn Adaları' },
  { code: 'WF', name: 'Wallis ve Futuna' },
  { code: 'WS', name: 'Samoa' },
  { code: 'TO', name: 'Tonga' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'SB', name: 'Solomon Adaları' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'NR', name: 'Nauru' },
  { code: 'PW', name: 'Palau' },
  { code: 'FM', name: 'Mikronezya' },
  { code: 'MH', name: 'Marshall Adaları' },
  { code: 'AS', name: 'Amerikan Samoası' },
  { code: 'GU', name: 'Guam' },
  { code: 'MP', name: 'Kuzey Mariana Adaları' },
  { code: 'CK', name: 'Cook Adaları' },
  { code: 'NU', name: 'Niue' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'PN', name: 'Pitcairn Adaları' },
  { code: 'WF', name: 'Wallis ve Futuna' },
  { code: 'US', name: 'ABD' },
  { code: 'CA', name: 'Kanada' },
  { code: 'MX', name: 'Meksika' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'BZ', name: 'Belize' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'HN', name: 'Honduras' },
  { code: 'NI', name: 'Nikaragua' },
  { code: 'CR', name: 'Kosta Rika' },
  { code: 'PA', name: 'Panama' },
  { code: 'CU', name: 'Küba' },
  { code: 'JM', name: 'Jamaika' },
  { code: 'HT', name: 'Haiti' },
  { code: 'DO', name: 'Dominik Cumhuriyeti' },
  { code: 'PR', name: 'Porto Riko' },
  { code: 'TT', name: 'Trinidad ve Tobago' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BS', name: 'Bahamalar' },
  { code: 'AG', name: 'Antigua ve Barbuda' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent ve Grenadinler' },
  { code: 'GD', name: 'Grenada' },
  { code: 'DM', name: 'Dominika' },
  { code: 'KN', name: 'Saint Kitts ve Nevis' },
  { code: 'AR', name: 'Arjantin' },
  { code: 'CL', name: 'Şili' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivya' },
  { code: 'PE', name: 'Peru' },
  { code: 'EC', name: 'Ekvador' },
  { code: 'CO', name: 'Kolombiya' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'GY', name: 'Guyana' },
  { code: 'SR', name: 'Surinam' },
  { code: 'GF', name: 'Fransız Guyanası' },
  { code: 'FK', name: 'Falkland Adaları' },
  { code: 'GS', name: 'Güney Georgia ve Güney Sandwich Adaları' },
  { code: 'AI', name: 'Anguilla' },
  { code: 'VG', name: 'Britanya Virjin Adaları' },
  { code: 'VI', name: 'ABD Virjin Adaları' },
  { code: 'GP', name: 'Guadeloupe' },
  { code: 'MQ', name: 'Martinik' },
  { code: 'CW', name: 'Curaçao' },
  { code: 'AW', name: 'Aruba' },
  { code: 'SX', name: 'Sint Maarten' },
  { code: 'BQ', name: 'Karayip Hollandası' },
  { code: 'KY', name: 'Cayman Adaları' },
  { code: 'TCA', name: 'Turks ve Caicos Adaları' }, // TCA olarak değiştirildi
  { code: 'BM', name: 'Bermuda' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'PM', name: 'Saint Pierre ve Miquelon' },
  { code: 'GL', name: 'Grönland' },
  { code: 'FO', name: 'Faroe Adaları' },
  { code: 'IS', name: 'İzlanda' },
  { code: 'AX', name: 'Åland Adaları' },
  { code: 'SJ', name: 'Svalbard ve Jan Mayen' },
  { code: 'GG', name: 'Guernsey' },
  { code: 'JE', name: 'Jersey' },
  { code: 'IM', name: 'Man Adası' },
  { code: 'GI', name: 'Cebelitarık' },
  { code: 'AD', name: 'Andorra' },
  { code: 'MC', name: 'Monako' },
  { code: 'SM', name: 'San Marino' },
  { code: 'VA', name: 'Vatikan' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'MT', name: 'Malta' },
  { code: 'CY', name: 'Kıbrıs' },
  { code: 'LU', name: 'Lüksemburg' },
  { code: 'EE', name: 'Estonya' },
  { code: 'LV', name: 'Letonya' },
  { code: 'LT', name: 'Litvanya' },
  { code: 'SK', name: 'Slovakya' },
  { code: 'SI', name: 'Slovenya' },
  { code: 'HR', name: 'Hırvatistan' },
  { code: 'BA', name: 'Bosna Hersek' },
  { code: 'RS', name: 'Sırbistan' },
  { code: 'ME', name: 'Karadağ' },
  { code: 'MK', name: 'Kuzey Makedonya' },
  { code: 'AL', name: 'Arnavutluk' },
  { code: 'XK', name: 'Kosova' },
  { code: 'MD', name: 'Moldova' },
  { code: 'UA', name: 'Ukrayna' },
  { code: 'BY', name: 'Belarus' },
  { code: 'RO', name: 'Romanya' },
  { code: 'BG', name: 'Bulgaristan' },
  { code: 'HU', name: 'Macaristan' },
  { code: 'IE', name: 'İrlanda' },
  { code: 'NO', name: 'Norveç' },
  { code: 'SE', name: 'İsveç' },
  { code: 'FI', name: 'Finlandiya' },
  { code: 'DK', name: 'Danimarka' },
  { code: 'PL', name: 'Polonya' },
  { code: 'CZ', name: 'Çek Cumhuriyeti' },
  { code: 'AT', name: 'Avusturya' },
  { code: 'CH', name: 'İsviçre' },
  { code: 'DE', name: 'Almanya' },
  { code: 'NL', name: 'Hollanda' },
  { code: 'BE', name: 'Belçika' },
  { code: 'FR', name: 'Fransa' },
  { code: 'ES', name: 'İspanya' },
  { code: 'PT', name: 'Portekiz' },
  { code: 'IT', name: 'İtalya' },
  { code: 'GR', name: 'Yunanistan' },
  { code: 'GB', name: 'İngiltere' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'RU', name: 'Rusya' },
  { code: 'JP', name: 'Japonya' },
  { code: 'CN', name: 'Çin' },
  { code: 'IN', name: 'Hindistan' },
  { code: 'BR', name: 'Brezilya' },
  { code: 'AU', name: 'Avustralya' },
  { code: 'CA', name: 'Kanada' },
  { code: 'MX', name: 'Meksika' },
  { code: 'AR', name: 'Arjantin' },
  { code: 'ZA', name: 'Güney Afrika' },
  { code: 'EG', name: 'Mısır' },
  { code: 'AE', name: 'Birleşik Arap Emirlikleri' },
  { code: 'SA', name: 'Suudi Arabistan' },
  { code: 'IL', name: 'İsrail' },
  { code: 'KR', name: 'Güney Kore' },
  { code: 'SG', name: 'Singapur' },
  { code: 'TH', name: 'Tayland' },
  { code: 'MY', name: 'Malezya' },
  { code: 'ID', name: 'Endonezya' },
  { code: 'PH', name: 'Filipinler' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'NZ', name: 'Yeni Zelanda' }
];

// Tekrarları temizle ve sırala
export const COUNTRIES = Array.from(
  new Map(ALL_COUNTRIES.map(item => [item.code, item])).values()
).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

const CustomerDetailDialog = ({ open, onOpenChange, customerName, initialData, onSave }) => {
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    nationality: '',
    id_number: '',
    birth_date: ''
  });
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState('');

  useEffect(() => {
    if (open) {
      // Dialog açıldığında initial data'yı yükle
      setFormData({
        phone: initialData?.phone || initialData?.customer_details?.phone || '',
        email: initialData?.email || initialData?.customer_details?.email || '',
        nationality: initialData?.nationality || initialData?.customer_details?.nationality || '',
        id_number: initialData?.id_number || initialData?.customer_details?.id_number || '',
        birth_date: initialData?.birth_date || initialData?.customer_details?.birth_date || ''
      });
      setNationalitySearch('');
      setNationalityOpen(false);
    }
  }, [open, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Sadece dolu alanları gönder
    const details = {};
    if (formData.phone) details.phone = formData.phone;
    if (formData.email) details.email = formData.email;
    if (formData.nationality) details.nationality = formData.nationality;
    if (formData.id_number) details.id_number = formData.id_number;
    if (formData.birth_date) details.birth_date = formData.birth_date;
    
    onSave(details);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#25272A] border-[#2D2F33] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Müşteri Detayları</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Ad-Soyad (Readonly) */}
          <div>
            <Label className="text-sm font-medium text-[#A5A5A5]">Ad-Soyad</Label>
            <Input
              value={customerName}
              disabled
              className="bg-[#2D2F33] border-[#2D2F33] text-[#A5A5A5] cursor-not-allowed"
            />
          </div>

          {/* Telefon */}
          <div>
            <Label className="text-sm font-medium text-white">Telefon</Label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Telefon numarası"
              className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
            />
          </div>

          {/* Email */}
          <div>
            <Label className="text-sm font-medium text-white">Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email adresi"
              className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
            />
          </div>

          {/* Uyruk - Searchable */}
          <div>
            <Label className="text-sm font-medium text-white">Uyruk</Label>
            <Popover open={nationalityOpen} onOpenChange={setNationalityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={nationalityOpen}
                  className="w-full justify-between bg-[#2D2F33] border-[#2D2F33] text-white hover:bg-[#2D2F33] hover:text-white"
                >
                  {formData.nationality
                    ? COUNTRIES.find((country) => country.code === formData.nationality)?.name || formData.nationality
                    : "Uyruk seçin veya yazın..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-[#2D2F33] border-[#2D2F33]">
                <Command className="bg-[#2D2F33]">
                  <CommandInput
                    placeholder="Uyruk ara..."
                    value={nationalitySearch}
                    onValueChange={setNationalitySearch}
                    className="text-white placeholder:text-[#A5A5A5]"
                  />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty className="text-[#A5A5A5] py-6 text-center text-sm">
                      {nationalitySearch ? (
                        <div>
                          <div className="mb-2">Sonuç bulunamadı</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({ ...formData, nationality: nationalitySearch.toUpperCase() });
                              setNationalityOpen(false);
                              setNationalitySearch('');
                            }}
                            className="bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white border-0"
                          >
                            "{nationalitySearch.toUpperCase()}" olarak kaydet
                          </Button>
                        </div>
                      ) : (
                        'Uyruk bulunamadı'
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {COUNTRIES
                        .filter((country) =>
                          country.name.toLowerCase().includes(nationalitySearch.toLowerCase()) ||
                          country.code.toLowerCase().includes(nationalitySearch.toLowerCase())
                        )
                        .map((country) => (
                          <CommandItem
                            key={country.code}
                            value={country.code}
                            onSelect={() => {
                              setFormData({ ...formData, nationality: country.code });
                              setNationalityOpen(false);
                              setNationalitySearch('');
                            }}
                            className="text-white hover:bg-[#3EA6FF]/20 cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.nationality === country.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {country.name} ({country.code})
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* TC/Pasaport No */}
          <div>
            <Label className="text-sm font-medium text-white">TC/Pasaport No</Label>
            <Input
              type="text"
              value={formData.id_number}
              onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
              placeholder="TC veya Pasaport numarası"
              className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
            />
          </div>

          {/* Doğum Tarihi */}
          <div>
            <Label className="text-sm font-medium text-white">Doğum Tarihi</Label>
            <Input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="bg-[#2D2F33] border-[#2D2F33] text-white focus:border-[#3EA6FF]"
            />
          </div>

          {/* Butonlar */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-[#2D2F33] text-[#A5A5A5] hover:bg-[#2D2F33]"
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#3EA6FF] hover:bg-[#2B8FE6] text-white"
            >
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailDialog;


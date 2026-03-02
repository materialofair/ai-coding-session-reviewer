#!/usr/bin/env node
/**
 * i18n 키 동기화 스크립트 (Namespace 기반)
 * 영어(en)를 기준으로 다른 언어에 누락된 키를 추가합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LANGUAGES, NAMESPACES } from './i18n-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');

// LANGUAGES에서 'en' 제외 (기준 언어이므로)
const TARGET_LANGUAGES = LANGUAGES.filter(lang => lang !== 'en');

function main() {
  console.log('i18n 키 동기화 시작 (Namespace 기반)...\n');

  const enDir = path.join(LOCALES_DIR, 'en');

  // Namespace별 동기화
  for (const ns of NAMESPACES) {
    const enPath = path.join(enDir, `${ns}.json`);
    if (!fs.existsSync(enPath)) {
      console.warn(`⚠️ ${ns}: en/${ns}.json 없음, 건너뜀`);
      continue;
    }

    const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    const enKeys = new Set(Object.keys(en));

    console.log(`\n📦 ${ns} (${enKeys.size}개 키)`);

    for (const lang of TARGET_LANGUAGES) {
      const langDir = path.join(LOCALES_DIR, lang);
      const langPath = path.join(langDir, `${ns}.json`);

      // 디렉토리 생성
      if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true });
      }

      let langData = {};
      if (fs.existsSync(langPath)) {
        langData = JSON.parse(fs.readFileSync(langPath, 'utf-8'));
      }

      const langKeys = new Set(Object.keys(langData));

      // 영어에 있지만 해당 언어에 없는 키 찾기
      const missingKeys = [...enKeys].filter(k => !langKeys.has(k));

      // 해당 언어에 있지만 영어에 없는 키 찾기 (삭제 대상)
      const extraKeys = [...langKeys].filter(k => !enKeys.has(k));

      if (missingKeys.length > 0) {
        console.log(`  ${lang}: +${missingKeys.length}개 키 추가`);
        for (const key of missingKeys) {
          langData[key] = en[key]; // 영어 값으로 대체
        }
      }

      if (extraKeys.length > 0) {
        console.log(`  ${lang}: -${extraKeys.length}개 불필요한 키 제거`);
        for (const key of extraKeys) {
          delete langData[key];
        }
      }

      if (missingKeys.length === 0 && extraKeys.length === 0) {
        console.log(`  ${lang}: ✅ 동기화됨`);
      }

      // 키 정렬 (영어 순서 기준)
      const sorted = {};
      for (const key of Object.keys(en)) {
        if (langData[key] !== undefined) {
          sorted[key] = langData[key];
        }
      }

      // 저장
      fs.writeFileSync(langPath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
    }
  }

  console.log('\n=== 동기화 완료 ===');

  // 최종 검증
  console.log('\n최종 키 개수:');
  for (const lang of ['en', ...TARGET_LANGUAGES]) {
    const langDir = path.join(LOCALES_DIR, lang);
    let total = 0;
    for (const ns of NAMESPACES) {
      const nsPath = path.join(langDir, `${ns}.json`);
      if (fs.existsSync(nsPath)) {
        const data = JSON.parse(fs.readFileSync(nsPath, 'utf-8'));
        total += Object.keys(data).length;
      }
    }
    console.log(`  ${lang}: ${total}개`);
  }
}

main();

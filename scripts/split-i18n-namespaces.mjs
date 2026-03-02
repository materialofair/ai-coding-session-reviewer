#!/usr/bin/env node
/**
 * i18n Namespace 분리 스크립트
 *
 * 기존 구조: locales/{lang}.json (단일 파일, 1392 keys)
 * 새 구조: locales/{lang}/{namespace}.json (namespace별 파일)
 *
 * LLM 친화적 구조를 위해 63개 prefix를 논리적 namespace로 통합
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LANGUAGES, NAMESPACES } from './i18n-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');

/**
 * Prefix → Namespace 매핑
 *
 * 63개 prefix를 12개 논리적 namespace로 통합
 * 각 namespace는 LLM이 한 번에 처리 가능한 크기 (2-12K tokens)
 */
const PREFIX_TO_NAMESPACE = {
  // common: 공통 UI 요소 (~80 keys)
  common: 'common',
  status: 'common',
  time: 'common',
  copyButton: 'common',

  // analytics: 분석 대시보드 (~132 keys)
  analytics: 'analytics',

  // session: 세션 및 프로젝트 (~116 keys)
  session: 'session',
  project: 'session',

  // settings: 설정 관리자 (~500 keys)
  settingsManager: 'settings',
  settings: 'settings',
  folderPicker: 'settings',

  // tools: 도구 및 결과 (~58 keys)
  tools: 'tools',
  toolResult: 'tools',
  toolUseRenderer: 'tools',
  collapsibleToolResult: 'tools',

  // error: 에러 메시지 (~37 keys)
  error: 'error',

  // message: 메시지 뷰어 (~80 keys)
  message: 'message',
  messages: 'message',
  messageViewer: 'message',
  messageContentDisplay: 'message',

  // renderers: 각종 렌더러 컴포넌트 (~200 keys)
  advancedTextDiff: 'renderers',
  agentProgressGroup: 'renderers',
  agentTaskGroup: 'renderers',
  assistantMessageDetails: 'renderers',
  bashCodeExecutionToolResultRenderer: 'renderers',
  captureMode: 'renderers',
  citationRenderer: 'renderers',
  claudeContentArrayRenderer: 'renderers',
  claudeSessionHistoryRenderer: 'renderers',
  claudeToolUseDisplay: 'renderers',
  codebaseContextRenderer: 'renderers',
  codeExecutionToolResultRenderer: 'renderers',
  commandOutputDisplay: 'renderers',
  commandRenderer: 'renderers',
  contentArray: 'renderers',
  diffViewer: 'renderers',
  fileContent: 'renderers',
  fileEditRenderer: 'renderers',
  fileHistorySnapshotRenderer: 'renderers',
  fileListRenderer: 'renderers',
  gitWorkflowRenderer: 'renderers',
  globalSearch: 'renderers',
  imageRenderer: 'renderers',
  mcpRenderer: 'renderers',
  progressRenderer: 'renderers',
  queueOperationRenderer: 'renderers',
  structuredPatch: 'renderers',
  summaryMessageRenderer: 'renderers',
  systemMessageRenderer: 'renderers',
  taskNotification: 'renderers',
  taskOperation: 'renderers',
  terminalStreamRenderer: 'renderers',
  textEditorCodeExecutionToolResultRenderer: 'renderers',
  thinkingRenderer: 'renderers',
  toolSearchToolResultRenderer: 'renderers',
  webFetchToolResultRenderer: 'renderers',
  webSearchRenderer: 'renderers',

  // update: 업데이트 관련 (~70 keys)
  updateModal: 'update',
  updateSettingsModal: 'update',
  updateIntroModal: 'update',
  simpleUpdateModal: 'update',
  upToDateNotification: 'update',

  // feedback: 피드백 (~32 keys)
  feedback: 'feedback',

  // recentEdits: 최근 편집 (~20 keys)
  recentEdits: 'recentEdits',
};

/**
 * Prefix로 namespace 결정
 */
function getNamespace(key) {
  const prefix = key.split('.')[0];
  return PREFIX_TO_NAMESPACE[prefix] || 'misc';
}

/**
 * 키에서 namespace prefix 제거 (선택적)
 * 현재는 기존 키 형식 유지를 위해 제거하지 않음
 */
function getKeyWithinNamespace(key) {
  // 기존 호환성을 위해 전체 키 유지
  return key;
}

/**
 * 언어별 파일을 namespace로 분리
 */
function splitLanguage(lang) {
  const inputPath = path.join(LOCALES_DIR, `${lang}.json`);
  const outputDir = path.join(LOCALES_DIR, lang);

  // 기존 단일 파일 로드
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  // 출력 디렉토리 생성
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Namespace별로 분류
  const namespaceData = {};
  for (const ns of [...NAMESPACES, 'misc']) {
    namespaceData[ns] = {};
  }

  for (const [key, value] of Object.entries(data)) {
    const ns = getNamespace(key);
    const nsKey = getKeyWithinNamespace(key);
    namespaceData[ns][nsKey] = value;
  }

  // Namespace별 파일 저장
  const stats = {};
  for (const [ns, nsData] of Object.entries(namespaceData)) {
    const keyCount = Object.keys(nsData).length;
    if (keyCount === 0) continue;

    const outputPath = path.join(outputDir, `${ns}.json`);

    // 키 정렬
    const sorted = {};
    for (const key of Object.keys(nsData).sort()) {
      sorted[key] = nsData[key];
    }

    fs.writeFileSync(outputPath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
    stats[ns] = keyCount;
  }

  return stats;
}

/**
 * 메인 실행
 */
function main() {
  console.log('i18n Namespace 분리 시작...\n');
  console.log(`대상 언어: ${LANGUAGES.join(', ')}`);
  console.log(`Namespace 수: ${NAMESPACES.length + 1} (misc 포함)\n`);

  const allStats = {};

  for (const lang of LANGUAGES) {
    console.log(`\n=== ${lang} ===`);
    const stats = splitLanguage(lang);
    allStats[lang] = stats;

    for (const [ns, count] of Object.entries(stats)) {
      console.log(`  ${ns}: ${count} keys`);
    }
  }

  // 일관성 검증
  console.log('\n=== 일관성 검증 ===');
  const baseStats = allStats['en'];
  let consistent = true;

  for (const lang of LANGUAGES) {
    if (lang === 'en') continue;

    for (const ns of Object.keys(baseStats)) {
      const enCount = baseStats[ns] || 0;
      const langCount = allStats[lang][ns] || 0;

      if (enCount !== langCount) {
        console.log(`⚠️ ${lang}/${ns}: ${langCount} keys (en: ${enCount})`);
        consistent = false;
      }
    }
  }

  if (consistent) {
    console.log('✅ 모든 언어의 namespace별 키 개수가 일치합니다.');
  }

  // 요약 출력
  console.log('\n=== 요약 ===');
  let total = 0;
  for (const [ns, count] of Object.entries(baseStats)) {
    console.log(`${ns}: ${count} keys`);
    total += count;
  }
  console.log(`\n총 ${total} keys → ${Object.keys(baseStats).length} namespaces`);
}

main();

#!/bin/bash

# NoStepBack Apps Script 배포 스크립트

echo "🚀 NoStepBack 배포 시작..."

# 1. 코드 동기화
echo "📤 코드 업로드 중..."
clasp push

if [ $? -ne 0 ]; then
    echo "❌ 코드 업로드 실패"
    exit 1
fi

# 2. 배포
echo "🔄 배포 중..."
clasp deploy

if [ $? -ne 0 ]; then
    echo "❌ 배포 실패"
    exit 1
fi

echo "✅ 배포 완료!"
echo "🎉 앱 바로가기: https://script.google.com/macros/s/AKfycbyTEOXemEy0q67fjn2yqxnNlxobfCD9yIf0hcrbF6jvy3q1YSevu5T8kGDiTX7qX9bWpw/exec"

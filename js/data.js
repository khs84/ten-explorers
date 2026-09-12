/* 단원별 데이터: 이 파일만 바꾸면 다른 학년/단원에도 같은 게임 엔진을 재사용할 수 있습니다. */
window.TEN_EXPLORERS_DATA = {
  meta: {
    title: "십의 탐험대",
    unitLabel: "20까지의 수",
    tagline: "오늘의 미션: 10개를 한 묶음으로 만들어 봅시다"
  },
  stations: [
    {
      id: "egg",
      icon: "🥚",
      title: "달걀판 세기",
      sub: "달걀판을 보고 모두 몇 개인지 알아봐요.",
      instruction: "달걀판 10개랑 남은 달걀을 합하면 모두 몇 개일까요?",
      bundleSize: 10,
      min: 11,
      max: 19
    },
    {
      id: "leaf",
      icon: "🍃",
      title: "나뭇잎 나무",
      sub: "나뭇잎을 색칠하며 하나씩 세어 봐요.",
      instruction: "나뭇잎을 하나씩 눌러 색칠하며 모두 세어 봅시다.",
      bundleSize: 10,
      min: 11,
      max: 19
    },
    {
      id: "cookie",
      icon: "🍪",
      title: "과자 쟁반",
      sub: "쟁반에 과자를 정확히 10개만 담아요.",
      instruction: "쟁반에 과자를 정확히 10개만 담아 봅시다.",
      bundleSize: 10
    },
    {
      id: "star",
      icon: "⭐",
      title: "별 10개 묶기",
      sub: "별 10개를 골라 묶고 모두 세어 봐요.",
      instruction: "별 10개를 골라 하나의 묶음으로 만들어 봅시다.",
      bundleSize: 10,
      min: 11,
      max: 19
    },
    {
      id: "boss",
      icon: "🧭",
      title: "점 몬스터를 막아라!",
      sub: "점을 10개씩 묶어 몬스터를 물리쳐요.",
      instruction: "점을 10개씩 묶어서 몬스터를 두 번 물리쳐요!",
      bundleSize: 10,
      rounds: [
        {min: 11, max: 20},
        {min: 11, max: 20}
      ]
    }
  ]
};

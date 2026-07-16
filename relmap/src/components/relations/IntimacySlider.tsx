interface IntimacySliderProps {
  value: number // 0-100
  onChange?: (value: number) => void
  readOnly?: boolean
}

// 亲密度等级配置：max 为该等级的上界
// 颜色类名以静态字符串写出，确保 Tailwind 内容扫描能识别
const LEVELS = [
  { max: 20, label: '疏远', color: '#EF4444', textClass: 'text-intimacy-stranger' },
  { max: 40, label: '一般', color: '#F97316', textClass: 'text-intimacy-casual' },
  { max: 60, label: '普通', color: '#EAB308', textClass: 'text-intimacy-normal' },
  { max: 80, label: '好友', color: '#22C55E', textClass: 'text-intimacy-friend' },
  { max: 100, label: '密友', color: '#06B6D4', textClass: 'text-intimacy-close' },
] as const

function getLevel(value: number) {
  return LEVELS.find((l) => value <= l.max) ?? LEVELS[LEVELS.length - 1]
}

export default function IntimacySlider({ value, onChange, readOnly }: IntimacySliderProps) {
  const level = getLevel(value)

  if (readOnly) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: level.color }}
        />
        <span className={`text-sm font-medium ${level.textClass}`}>{level.label}</span>
        <span className="text-sm text-gray-400">{value}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${level.textClass}`}>{level.label}</span>
        <span className={`text-sm font-bold ${level.textClass}`}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="w-full h-2 cursor-pointer"
        style={{ accentColor: level.color }}
      />
    </div>
  )
}

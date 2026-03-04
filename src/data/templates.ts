export type WorkoutDayKey =
  | 'upper_a'
  | 'lower_a'
  | 'upper_b'
  | 'lower_b'

export type WorkoutTemplate = {
  dayKey: WorkoutDayKey
  dayName: string
  exercises: Array<{
    exercise_key: string
    exercise_name: string
    /** Key of the exercise this is supersetted with (navigate quickly between them). */
    superset_partner_key?: string
    /** Default rest period in seconds after logging a set. */
    rest_seconds?: number
  }>
}

export const workoutTemplates: Record<WorkoutDayKey, WorkoutTemplate> = {
  upper_a: {
    dayKey: 'upper_a',
    dayName: 'Upper A',
    exercises: [
      { exercise_key: 'dumbbell_bench_press', exercise_name: 'Dumbbell Bench Press', rest_seconds: 180 },
      { exercise_key: 'barbell_bench', exercise_name: 'Barbell Bench', rest_seconds: 180 },
      { exercise_key: 'smith_flat_press', exercise_name: 'Smith Flat Press', rest_seconds: 180 },
      { exercise_key: 'vertical_pull', exercise_name: 'Vertical Pull', rest_seconds: 180 },
      { exercise_key: 'wide_grip_lat_pulldown', exercise_name: 'Wide Grip Lat Pulldown', rest_seconds: 180 },
      { exercise_key: 'neutral_grip_pulldown', exercise_name: 'Neutral Grip Pulldown', rest_seconds: 180 },
      { exercise_key: 'lat_pulldown_mag_bar', exercise_name: 'Lat Pulldown MAG Bar', rest_seconds: 180 },
      { exercise_key: 'smith_machine_shoulder_press', exercise_name: 'Smith Machine Shoulder Press', rest_seconds: 180 },
      { exercise_key: 'shoulder_press_machine', exercise_name: 'Shoulder Press Machine', rest_seconds: 180 },
      { exercise_key: 'landmine_press', exercise_name: 'Landmine Press', rest_seconds: 180 },
      { exercise_key: 'horizontal_row', exercise_name: 'Horizontal Row', rest_seconds: 180 },
      { exercise_key: 'plate_loaded_seated_row', exercise_name: 'Alternating Plate-Loaded Seated Row', rest_seconds: 180 },
      { exercise_key: 'chest_supported_machine_row', exercise_name: 'Chest-Supported Machine Row', rest_seconds: 180 },
      { exercise_key: 'push_ups', exercise_name: 'Push-Ups', rest_seconds: 90 },
      { exercise_key: 'push_ups_standard', exercise_name: 'Push-Ups Standard', rest_seconds: 90 },
      { exercise_key: 'push_ups_decline', exercise_name: 'Push-Ups Decline', rest_seconds: 90 },
      { exercise_key: 'push_ups_weighted', exercise_name: 'Push-Ups Weighted', rest_seconds: 90 },
      { exercise_key: 'cable_face_pulls', exercise_name: 'Cable Face Pulls', rest_seconds: 120 },
      { exercise_key: 'rope_face_pull', exercise_name: 'Rope Face Pull', rest_seconds: 120 },
      { exercise_key: 'rear_delt_cable_fly', exercise_name: 'Rear Delt Cable Fly', rest_seconds: 120 },
      { exercise_key: 'lateral_raise', exercise_name: 'Lateral Raise', rest_seconds: 90, superset_partner_key: 'biceps_isolation' },
      { exercise_key: 'lateral_raise_machine', exercise_name: 'Lateral Raise Machine', rest_seconds: 90 },
      { exercise_key: 'cable_lateral_raise', exercise_name: 'Cable Lateral Raise', rest_seconds: 90 },
      { exercise_key: 'cable_crunches', exercise_name: 'Cable Crunches', rest_seconds: 90 },
      { exercise_key: 'machine_crunch', exercise_name: 'Machine Crunch', rest_seconds: 90 },
      { exercise_key: 'leg_raises', exercise_name: 'Leg Raises', rest_seconds: 60 },
      { exercise_key: 'biceps_isolation', exercise_name: 'Biceps Isolation', rest_seconds: 90, superset_partner_key: 'lateral_raise' },
      { exercise_key: 'triceps_isolation', exercise_name: 'Triceps Isolation', rest_seconds: 90 },
      { exercise_key: 'captains_chair', exercise_name: "Captain's Chair", rest_seconds: 60 },
    ],
  },
  lower_a: {
    dayKey: 'lower_a',
    dayName: 'Lower A',
    exercises: [
      { exercise_key: 'hex_bar_deadlift', exercise_name: 'Hex Bar Deadlift', rest_seconds: 240 },
      { exercise_key: 'trap_bar_high_handle', exercise_name: 'Trap Bar High Handle', rest_seconds: 240 },
      { exercise_key: 'rdl', exercise_name: 'RDL', rest_seconds: 180 },
      { exercise_key: 'bulgarian_split_squat', exercise_name: 'Bulgarian Split Squat', rest_seconds: 180 },
      { exercise_key: 'bss_smith_machine', exercise_name: 'Bulgarian Split Squat (Smith Machine)', rest_seconds: 180 },
      { exercise_key: 'bss_dbs', exercise_name: 'Bulgarian Split Squat (DBs)', rest_seconds: 180 },
      { exercise_key: 'bss_front_foot_elevated', exercise_name: 'Bulgarian Split Squat (Front-Foot Elevated)', rest_seconds: 180 },
      { exercise_key: 'hamstring_curl', exercise_name: 'Hamstring Curl', rest_seconds: 180 },
      { exercise_key: 'hamstring_curl_seated', exercise_name: 'Hamstring Curl (Seated)', rest_seconds: 180 },
      { exercise_key: 'hamstring_curl_prone', exercise_name: 'Hamstring Curl (Prone)', rest_seconds: 180 },
      { exercise_key: 'leg_extension', exercise_name: 'Leg Extension (Optional)', rest_seconds: 180 },
      { exercise_key: 'hip_abduction', exercise_name: 'Hip Abduction Machine', rest_seconds: 120 },
      { exercise_key: 'cable_abduction', exercise_name: 'Cable Abduction', rest_seconds: 120 },
      { exercise_key: 'calf_raise_machine', exercise_name: 'Calf Raise Machine', rest_seconds: 90 },
      { exercise_key: 'standing_calf_raise', exercise_name: 'Standing Calf Raise', rest_seconds: 90 },
      { exercise_key: 'seated_calf_raise', exercise_name: 'Seated Calf Raise', rest_seconds: 90 },
      { exercise_key: 'leg_press_calf_raise', exercise_name: 'Leg Press Calf Raise', rest_seconds: 90 },
      { exercise_key: 'cable_crunches', exercise_name: 'Cable Crunches', rest_seconds: 90 },
    ],
  },
  upper_b: {
    dayKey: 'upper_b',
    dayName: 'Upper B',
    exercises: [
      { exercise_key: 'lat_pulldown', exercise_name: 'Primary Lat Pulldown (Heavier)', rest_seconds: 180 },
      { exercise_key: 'lat_pulldown_wide_grip', exercise_name: 'Lat Pulldown Wide Grip', rest_seconds: 180 },
      { exercise_key: 'lat_pulldown_mag_bar', exercise_name: 'Lat Pulldown MAG Bar', rest_seconds: 180 },
      { exercise_key: 'lat_pulldown_neutral_grip', exercise_name: 'Lat Pulldown Neutral Grip', rest_seconds: 180 },
      { exercise_key: 'incline_press', exercise_name: 'Incline Press', rest_seconds: 180 },
      { exercise_key: 'smith_incline_press', exercise_name: 'Smith Incline Press', rest_seconds: 180 },
      { exercise_key: 'plate_loaded_incline_press', exercise_name: 'Plate-Loaded Incline Press', rest_seconds: 180 },
      { exercise_key: 'cable_press_fly', exercise_name: 'High-to-Low Cable Press / Fly', rest_seconds: 120 },
      { exercise_key: 'cable_press', exercise_name: 'Cable Press', rest_seconds: 120 },
      { exercise_key: 'cable_fly', exercise_name: 'Cable Fly', rest_seconds: 120 },
      { exercise_key: 'horizontal_row', exercise_name: 'Horizontal Row', rest_seconds: 180 },
      { exercise_key: 'plate_loaded_seated_row', exercise_name: 'Alternating Plate-Loaded Seated Row', rest_seconds: 180 },
      { exercise_key: 'chest_supported_row', exercise_name: 'Chest-Supported Row', rest_seconds: 180 },
      { exercise_key: 'push_ups', exercise_name: 'Push-Ups', rest_seconds: 90, superset_partner_key: 'cable_crunches' },
      { exercise_key: 'push_ups_standard', exercise_name: 'Push-Ups Standard', rest_seconds: 90 },
      { exercise_key: 'push_ups_decline', exercise_name: 'Push-Ups Decline', rest_seconds: 90 },
      { exercise_key: 'triceps_isolation', exercise_name: 'Triceps Isolation', rest_seconds: 90 },
      { exercise_key: 'cable_pushdown', exercise_name: 'Cable Pushdown', rest_seconds: 90 },
      { exercise_key: 'overhead_cable_extension', exercise_name: 'Overhead Cable Extension', rest_seconds: 90 },
      { exercise_key: 'biceps_isolation', exercise_name: 'Biceps Isolation', rest_seconds: 90, superset_partner_key: 'lateral_raise' },
      { exercise_key: 'ez_bar_cable_curl', exercise_name: 'EZ-Bar Cable Curl', rest_seconds: 90 },
      { exercise_key: 'straight_bar_curl', exercise_name: 'Straight Bar Curl', rest_seconds: 90 },
      { exercise_key: 'bicycle_kicks', exercise_name: 'Bicycle Kicks', rest_seconds: 60 },
      { exercise_key: 'dead_bugs', exercise_name: 'Dead Bugs', rest_seconds: 60 },
      { exercise_key: 'lateral_raise', exercise_name: 'Lateral Raise', rest_seconds: 90, superset_partner_key: 'biceps_isolation' },
      { exercise_key: 'cable_crunches', exercise_name: 'Cable Crunches', rest_seconds: 90, superset_partner_key: 'push_ups' },
    ],
  },
  lower_b: {
    dayKey: 'lower_b',
    dayName: 'Lower B',
    exercises: [
      { exercise_key: 'hip_thrust', exercise_name: 'Hip Thrust Machine', rest_seconds: 240 },
      { exercise_key: 'barbell_hip_thrust', exercise_name: 'Barbell Hip Thrust', rest_seconds: 240 },
      { exercise_key: 'smith_hip_thrust', exercise_name: 'Smith Hip Thrust', rest_seconds: 240 },
      { exercise_key: 'leg_extension', exercise_name: 'Leg Extension', rest_seconds: 180 },
      { exercise_key: 'hamstring_curl', exercise_name: 'Hamstring Curl', rest_seconds: 180 },
      { exercise_key: 'hamstring_curl_seated', exercise_name: 'Hamstring Curl (Seated)', rest_seconds: 180 },
      { exercise_key: 'hamstring_curl_prone', exercise_name: 'Hamstring Curl (Prone)', rest_seconds: 180 },
      { exercise_key: 'bulgarian_split_squat', exercise_name: 'Bulgarian Split Squat', rest_seconds: 180 },
      { exercise_key: 'bss_smith', exercise_name: 'Bulgarian Split Squat (Smith)', rest_seconds: 180 },
      { exercise_key: 'bss_db', exercise_name: 'Bulgarian Split Squat (DB)', rest_seconds: 180 },
      { exercise_key: 'bss_forward_torso', exercise_name: 'Bulgarian Split Squat (Slight forward torso)', rest_seconds: 180 },
      { exercise_key: 'hip_abduction', exercise_name: 'Hip Abduction Machine', rest_seconds: 120 },
      { exercise_key: 'pallof_press', exercise_name: 'Tall Kneeling Pallof Press (Cable)', rest_seconds: 90 },
      { exercise_key: 'calf_raise_machine', exercise_name: 'Calf Raise Machine', rest_seconds: 90 },
      { exercise_key: 'standing_calf_raise', exercise_name: 'Standing Calf Raise', rest_seconds: 90 },
      { exercise_key: 'seated_calf_raise', exercise_name: 'Seated Calf Raise', rest_seconds: 90 },
      { exercise_key: 'leg_press_calf_raise', exercise_name: 'Leg Press Calf Raise', rest_seconds: 90 },
      { exercise_key: 'straight_leg_lowers', exercise_name: 'Straight Leg Lowers w/ Overhead DB', rest_seconds: 60 },
      { exercise_key: 'reverse_crunch', exercise_name: 'Reverse Crunch', rest_seconds: 60 },
      { exercise_key: 'cable_crunches', exercise_name: 'Cable Crunches', rest_seconds: 90 },
    ],
  },
}

/** Find exercise config in any template. Returns template and exercise, or null. */
export function findExerciseInTemplates(exerciseKey: string): {
  template: WorkoutTemplate
  exercise: WorkoutTemplate['exercises'][number]
  exerciseIndex: number
} | null {
  for (const template of Object.values(workoutTemplates)) {
    const idx = template.exercises.findIndex((ex) => ex.exercise_key === exerciseKey)
    if (idx >= 0) {
      return { template, exercise: template.exercises[idx], exerciseIndex: idx }
    }
  }
  return null
}

// Get all unique exercises across all workout templates
export function getAllExercises(): Array<{
  exercise_key: string
  exercise_name: string
}> {
  const exerciseMap = new Map<string, string>()

  Object.values(workoutTemplates).forEach((template) => {
    template.exercises.forEach((ex) => {
      if (!exerciseMap.has(ex.exercise_key)) {
        exerciseMap.set(ex.exercise_key, ex.exercise_name)
      }
    })
  })

  return Array.from(exerciseMap.entries())
    .map(([exercise_key, exercise_name]) => ({ exercise_key, exercise_name }))
    .sort((a, b) => a.exercise_name.localeCompare(b.exercise_name))
}

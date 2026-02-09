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
  }>
}

export const workoutTemplates: Record<WorkoutDayKey, WorkoutTemplate> = {
  upper_a: {
    dayKey: 'upper_a',
    dayName: 'Upper A',
    exercises: [
      { exercise_key: 'dumbbell_bench_press', exercise_name: 'Dumbbell Bench Press' },
      { exercise_key: 'barbell_bench', exercise_name: 'Barbell Bench' },
      { exercise_key: 'smith_flat_press', exercise_name: 'Smith Flat Press' },
      { exercise_key: 'vertical_pull', exercise_name: 'Vertical Pull' },
      { exercise_key: 'wide_grip_lat_pulldown', exercise_name: 'Wide Grip Lat Pulldown' },
      { exercise_key: 'neutral_grip_pulldown', exercise_name: 'Neutral Grip Pulldown' },
      { exercise_key: 'stable_shoulder_press', exercise_name: 'Stable Shoulder Press' },
      { exercise_key: 'smith_machine_shoulder_press', exercise_name: 'Smith Machine Shoulder Press' },
      { exercise_key: 'shoulder_press_machine', exercise_name: 'Shoulder Press Machine' },
      { exercise_key: 'landmine_press', exercise_name: 'Landmine Press' },
      { exercise_key: 'horizontal_row', exercise_name: 'Horizontal Row' },
      { exercise_key: 'plate_loaded_seated_row', exercise_name: 'Alternating Plate-Loaded Seated Row' },
      { exercise_key: 'chest_supported_machine_row', exercise_name: 'Chest-Supported Machine Row' },
      { exercise_key: 'push_ups', exercise_name: 'Push-Ups' },
      { exercise_key: 'push_ups_standard', exercise_name: 'Push-Ups Standard' },
      { exercise_key: 'push_ups_decline', exercise_name: 'Push-Ups Decline' },
      { exercise_key: 'push_ups_weighted', exercise_name: 'Push-Ups Weighted' },
      { exercise_key: 'cable_face_pulls', exercise_name: 'Cable Face Pulls' },
      { exercise_key: 'rope_face_pull', exercise_name: 'Rope Face Pull' },
      { exercise_key: 'rear_delt_cable_fly', exercise_name: 'Rear Delt Cable Fly' },
      { exercise_key: 'lateral_raise', exercise_name: 'Lateral Raise' },
      { exercise_key: 'lateral_raise_machine', exercise_name: 'Lateral Raise Machine' },
      { exercise_key: 'cable_lateral_raise', exercise_name: 'Cable Lateral Raise' },
      { exercise_key: 'cable_crunches', exercise_name: 'Cable Crunches' },
      { exercise_key: 'machine_crunch', exercise_name: 'Machine Crunch' },
      { exercise_key: 'leg_raises', exercise_name: 'Leg Raises' },
      { exercise_key: 'biceps_isolation', exercise_name: 'Biceps Isolation' },
      { exercise_key: 'triceps_isolation', exercise_name: 'Triceps Isolation' },
      { exercise_key: 'captains_chair', exercise_name: "Captain's Chair" },
    ],
  },
  lower_a: {
    dayKey: 'lower_a',
    dayName: 'Lower A',
    exercises: [
      { exercise_key: 'hex_bar_deadlift', exercise_name: 'Hex Bar Deadlift' },
      { exercise_key: 'trap_bar_high_handle', exercise_name: 'Trap Bar High Handle' },
      { exercise_key: 'rdl', exercise_name: 'RDL' },
      { exercise_key: 'bulgarian_split_squat', exercise_name: 'Bulgarian Split Squat' },
      { exercise_key: 'bss_smith_machine', exercise_name: 'Bulgarian Split Squat (Smith Machine)' },
      { exercise_key: 'bss_dbs', exercise_name: 'Bulgarian Split Squat (DBs)' },
      { exercise_key: 'bss_front_foot_elevated', exercise_name: 'Bulgarian Split Squat (Front-Foot Elevated)' },
      { exercise_key: 'hamstring_curl', exercise_name: 'Hamstring Curl' },
      { exercise_key: 'hamstring_curl_seated', exercise_name: 'Hamstring Curl (Seated)' },
      { exercise_key: 'hamstring_curl_prone', exercise_name: 'Hamstring Curl (Prone)' },
      { exercise_key: 'leg_extension', exercise_name: 'Leg Extension (Optional)' },
      { exercise_key: 'hip_abduction', exercise_name: 'Hip Abduction Machine' },
      { exercise_key: 'cable_abduction', exercise_name: 'Cable Abduction' },
      { exercise_key: 'cable_crunches', exercise_name: 'Cable Crunches' },
    ],
  },
  upper_b: {
    dayKey: 'upper_b',
    dayName: 'Upper B',
    exercises: [
      { exercise_key: 'lat_pulldown', exercise_name: 'Primary Lat Pulldown (Heavier)' },
      { exercise_key: 'lat_pulldown_wide_grip', exercise_name: 'Lat Pulldown Wide Grip' },
      { exercise_key: 'lat_pulldown_mag_bar', exercise_name: 'Lat Pulldown MAG Bar' },
      { exercise_key: 'lat_pulldown_neutral_grip', exercise_name: 'Lat Pulldown Neutral Grip' },
      { exercise_key: 'incline_press', exercise_name: 'Incline Press' },
      { exercise_key: 'smith_incline_press', exercise_name: 'Smith Incline Press' },
      { exercise_key: 'plate_loaded_incline_press', exercise_name: 'Plate-Loaded Incline Press' },
      { exercise_key: 'cable_press_fly', exercise_name: 'High-to-Low Cable Press / Fly' },
      { exercise_key: 'cable_press', exercise_name: 'Cable Press' },
      { exercise_key: 'cable_fly', exercise_name: 'Cable Fly' },
      { exercise_key: 'horizontal_row', exercise_name: 'Horizontal Row' },
      { exercise_key: 'plate_loaded_seated_row', exercise_name: 'Alternating Plate-Loaded Seated Row' },
      { exercise_key: 'chest_supported_row', exercise_name: 'Chest-Supported Row' },
      { exercise_key: 'push_ups', exercise_name: 'Push-Ups' },
      { exercise_key: 'push_ups_standard', exercise_name: 'Push-Ups Standard' },
      { exercise_key: 'push_ups_decline', exercise_name: 'Push-Ups Decline' },
      { exercise_key: 'triceps_isolation', exercise_name: 'Triceps Isolation' },
      { exercise_key: 'cable_pushdown', exercise_name: 'Cable Pushdown' },
      { exercise_key: 'overhead_cable_extension', exercise_name: 'Overhead Cable Extension' },
      { exercise_key: 'biceps_isolation', exercise_name: 'Biceps Isolation' },
      { exercise_key: 'ez_bar_cable_curl', exercise_name: 'EZ-Bar Cable Curl' },
      { exercise_key: 'straight_bar_curl', exercise_name: 'Straight Bar Curl' },
      { exercise_key: 'bicycle_kicks', exercise_name: 'Bicycle Kicks' },
      { exercise_key: 'dead_bugs', exercise_name: 'Dead Bugs' },
      { exercise_key: 'cable_crunches', exercise_name: 'Cable Crunches' },
    ],
  },
  lower_b: {
    dayKey: 'lower_b',
    dayName: 'Lower B',
    exercises: [
      { exercise_key: 'hip_thrust', exercise_name: 'Hip Thrust Machine' },
      { exercise_key: 'barbell_hip_thrust', exercise_name: 'Barbell Hip Thrust' },
      { exercise_key: 'smith_hip_thrust', exercise_name: 'Smith Hip Thrust' },
      { exercise_key: 'leg_extension', exercise_name: 'Leg Extension' },
      { exercise_key: 'hamstring_curl', exercise_name: 'Hamstring Curl' },
      { exercise_key: 'hamstring_curl_seated', exercise_name: 'Hamstring Curl (Seated)' },
      { exercise_key: 'hamstring_curl_prone', exercise_name: 'Hamstring Curl (Prone)' },
      { exercise_key: 'bulgarian_split_squat', exercise_name: 'Bulgarian Split Squat' },
      { exercise_key: 'bss_smith', exercise_name: 'Bulgarian Split Squat (Smith)' },
      { exercise_key: 'bss_db', exercise_name: 'Bulgarian Split Squat (DB)' },
      { exercise_key: 'bss_forward_torso', exercise_name: 'Bulgarian Split Squat (Slight forward torso)' },
      { exercise_key: 'pallof_press', exercise_name: 'Tall Kneeling Pallof Press (Cable)' },
      { exercise_key: 'straight_leg_lowers', exercise_name: 'Straight Leg Lowers w/ Overhead DB' },
      { exercise_key: 'reverse_crunch', exercise_name: 'Reverse Crunch' },
    ],
  },
}

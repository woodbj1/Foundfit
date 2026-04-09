export type WorkoutBodyPart =
  | 'full-body'
  | 'upper-body'
  | 'lower-body'
  | 'glutes'
  | 'core'
  | 'mobility'

export type WorkoutGoal = 'strength' | 'hiit' | 'sculpt' | 'mobility'

export type WorkoutSource = 'daily' | 'guided' | 'custom' | 'random'

export type ExerciseDefinition = {
  id: string
  name: string
  bodyParts: WorkoutBodyPart[]
  goals: WorkoutGoal[]
  equipment: string[]
  summary: string
  setup: string
  howTo: string[]
  coachingCues: string[]
  commonMistakes: string[]
  demoVideoUrl?: string | null
}

export type WorkoutExercisePlan = {
  exerciseId: string
  prescription: string
  rest: string
  note?: string
}

export type WorkoutBlock = {
  id: string
  title: string
  summary: string
  bodyPart: WorkoutBodyPart
  goal: WorkoutGoal
  durationMinutes: number
  equipment: string[]
  level: 'beginner' | 'intermediate'
  trainerNote: string
  exercises: WorkoutExercisePlan[]
}

export type GuidedWorkoutSection = {
  id: string
  title: string
  summary: string
  durationMinutes: number
  exercises: Array<WorkoutExercisePlan & { exercise: ExerciseDefinition }>
}

export type GuidedWorkout = {
  id: string
  title: string
  summary: string
  source: WorkoutSource
  durationMinutes: number
  goal: WorkoutGoal
  bodyParts: WorkoutBodyPart[]
  equipment: string[]
  trainerNote: string
  monthlyTheme?: {
    label: string
    summary: string
  }
  sections: GuidedWorkoutSection[]
}

export const BODY_PART_OPTIONS: Array<{ value: WorkoutBodyPart | 'all'; label: string }> = [
  { value: 'all', label: 'All Workouts' },
  { value: 'full-body', label: 'Full Body' },
  { value: 'upper-body', label: 'Upper Body' },
  { value: 'lower-body', label: 'Lower Body' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'core', label: 'Core' },
  { value: 'mobility', label: 'Mobility' },
]

export const FOCUS_OPTIONS: Array<{ value: WorkoutBodyPart; label: string }> = BODY_PART_OPTIONS
  .filter((option) => option.value !== 'all') as Array<{ value: WorkoutBodyPart; label: string }>

export const GOAL_OPTIONS: Array<{ value: WorkoutGoal; label: string }> = [
  { value: 'strength', label: 'Strength Building' },
  { value: 'hiit', label: 'High Intensity' },
  { value: 'sculpt', label: 'Sculpt and Tone' },
  { value: 'mobility', label: 'Mobility and Recovery' },
]

export const TIME_OPTIONS = [10, 15, 20, 30, 40, 45]

const MONTHLY_THEMES = [
  {
    label: 'Foundation Flow',
    summary: 'Build consistent momentum with simple strength, sculpt, and recovery sessions.',
  },
  {
    label: 'Strength Reset',
    summary: 'Use controlled tempo and clean form to lock in stronger weekly habits.',
  },
  {
    label: 'Spring Energy',
    summary: 'Blend sculpt sessions with short cardio bursts and focused recovery work.',
  },
  {
    label: 'Power and Posture',
    summary: 'Alternate upper-body strength, glute work, and mobility to stay balanced.',
  },
  {
    label: 'Core Confidence',
    summary: 'Keep your trunk strong and steady with finishers that support every lift.',
  },
  {
    label: 'Summer Sweat',
    summary: 'Lean into high-energy circuits and bodyweight finishers without losing form.',
  },
  {
    label: 'Lift and Lengthen',
    summary: 'Pair muscular tension with breath-led mobility to recover better each week.',
  },
  {
    label: 'Back-to-Basics',
    summary: 'Refine the fundamentals and make every rep look strong and polished.',
  },
  {
    label: 'Glute and Core Lab',
    summary: 'Build lower-body strength while keeping your core active and connected.',
  },
  {
    label: 'Momentum Month',
    summary: 'Mix quick wins with longer guided sessions so it is easy to stay on track.',
  },
  {
    label: 'Holiday Balance',
    summary: 'Use shorter, efficient sessions to keep your energy and consistency high.',
  },
  {
    label: 'Year-End Recharge',
    summary: 'Finish strong with recovery-driven strength and low-impact conditioning.',
  },
]

export const EXERCISE_LIBRARY: Record<string, ExerciseDefinition> = {
  goblet_squat: {
    id: 'goblet_squat',
    name: 'Goblet Squat',
    bodyParts: ['lower-body', 'glutes', 'full-body'],
    goals: ['strength', 'sculpt'],
    equipment: ['Dumbbell or kettlebell'],
    summary: 'A front-loaded squat that builds leg strength while helping you stay tall.',
    setup: 'Hold one weight at your chest with feet just outside hip width and toes slightly out.',
    howTo: [
      'Brace your core and sit your hips down between your heels.',
      'Keep your chest lifted and knees tracking over your middle toes.',
      'Drive through your whole foot to stand tall without leaning back.',
    ],
    coachingCues: ['Ribs down', 'Elbows stay close', 'Push the floor away'],
    commonMistakes: ['Collapsing forward', 'Letting knees cave in', 'Rushing the bottom position'],
  },
  reverse_lunge: {
    id: 'reverse_lunge',
    name: 'Reverse Lunge',
    bodyParts: ['lower-body', 'glutes'],
    goals: ['strength', 'sculpt'],
    equipment: ['Bodyweight or dumbbells'],
    summary: 'A joint-friendly lower-body move that targets glutes, quads, and balance.',
    setup: 'Stand tall with feet under hips and hands at your sides or holding dumbbells.',
    howTo: [
      'Step one leg back softly and lower into a split squat.',
      'Keep your front heel heavy and your torso stacked over your hips.',
      'Press through the front leg to return to standing before switching sides.',
    ],
    coachingCues: ['Long spine', 'Front heel anchored', 'Control the step back'],
    commonMistakes: ['Pushing off the back foot', 'Falling forward', 'Landing too narrow'],
  },
  romanian_deadlift: {
    id: 'romanian_deadlift',
    name: 'Romanian Deadlift',
    bodyParts: ['lower-body', 'glutes', 'full-body'],
    goals: ['strength', 'sculpt'],
    equipment: ['Dumbbells'],
    summary: 'A hip-hinge pattern that strengthens your hamstrings and glutes.',
    setup: 'Stand tall with weights in front of thighs and a soft bend in your knees.',
    howTo: [
      'Push your hips back while dragging the weights down your legs.',
      'Stop when you feel tension in the back of your legs and your spine stays long.',
      'Squeeze your glutes to stand back up without shrugging the weights.',
    ],
    coachingCues: ['Hips back first', 'Neck long', 'Weights stay close'],
    commonMistakes: ['Rounding the back', 'Turning it into a squat', 'Dropping the weights away from the body'],
  },
  glute_bridge: {
    id: 'glute_bridge',
    name: 'Glute Bridge',
    bodyParts: ['glutes', 'core', 'lower-body'],
    goals: ['strength', 'sculpt', 'mobility'],
    equipment: ['Bodyweight or dumbbell'],
    summary: 'An accessible glute move that teaches you to extend through the hips.',
    setup: 'Lie on your back with knees bent, feet flat, and heels close to your hips.',
    howTo: [
      'Exhale and press through your heels to lift your hips.',
      'Stop when your knees, hips, and shoulders form a straight line.',
      'Lower slowly and keep your core gently braced the whole time.',
    ],
    coachingCues: ['Drive through heels', 'Ribs down', 'Squeeze glutes at the top'],
    commonMistakes: ['Arching the lower back', 'Pushing through the toes', 'Dropping too fast'],
  },
  push_up: {
    id: 'push_up',
    name: 'Push-Up',
    bodyParts: ['upper-body', 'core', 'full-body'],
    goals: ['strength', 'hiit'],
    equipment: ['Bodyweight'],
    summary: 'A classic pressing pattern that challenges your chest, shoulders, triceps, and core.',
    setup: 'Start in a tall plank with hands slightly wider than shoulders.',
    howTo: [
      'Brace your core and lower as one unit toward the floor.',
      'Keep elbows angled back instead of straight out to the sides.',
      'Press the floor away and return to a solid plank.',
    ],
    coachingCues: ['Glutes tight', 'Neck neutral', 'Whole body moves together'],
    commonMistakes: ['Sagging hips', 'Flaring elbows wide', 'Piking the hips'],
  },
  shoulder_press: {
    id: 'shoulder_press',
    name: 'Shoulder Press',
    bodyParts: ['upper-body', 'full-body'],
    goals: ['strength', 'sculpt'],
    equipment: ['Dumbbells'],
    summary: 'An overhead press that builds shoulder strength and upper-body control.',
    setup: 'Stand tall with dumbbells at shoulder height and wrists stacked over elbows.',
    howTo: [
      'Brace your core and press the weights straight overhead.',
      'Finish with biceps near your ears while keeping ribs down.',
      'Lower back to shoulder height with control.',
    ],
    coachingCues: ['Zip up your core', 'Press straight up', 'Stay tall through the crown of your head'],
    commonMistakes: ['Leaning back', 'Pressing too far forward', 'Losing control on the way down'],
  },
  bent_over_row: {
    id: 'bent_over_row',
    name: 'Bent-Over Row',
    bodyParts: ['upper-body', 'full-body'],
    goals: ['strength', 'sculpt'],
    equipment: ['Dumbbells'],
    summary: 'A pulling move that strengthens your upper back and helps posture.',
    setup: 'Hinge at the hips with a flat back and weights hanging under your shoulders.',
    howTo: [
      'Pull elbows toward your back pockets while squeezing your shoulder blades.',
      'Pause briefly at the top without shrugging.',
      'Lower the weights slowly until your arms are straight again.',
    ],
    coachingCues: ['Chest proud', 'Row to ribs', 'Neck stays long'],
    commonMistakes: ['Using momentum', 'Shrugging shoulders', 'Standing up between reps'],
  },
  dead_bug: {
    id: 'dead_bug',
    name: 'Dead Bug',
    bodyParts: ['core'],
    goals: ['strength', 'mobility'],
    equipment: ['Bodyweight'],
    summary: 'A deep-core drill that teaches you to stabilize while arms and legs move.',
    setup: 'Lie on your back with knees bent to 90 degrees and arms reaching to the ceiling.',
    howTo: [
      'Press your low back gently into the floor as you exhale.',
      'Extend the opposite arm and leg away from your body without losing contact with the floor.',
      'Return to center and repeat on the other side.',
    ],
    coachingCues: ['Slow exhale', 'Low back anchored', 'Move with control'],
    commonMistakes: ['Arching the back', 'Moving too fast', 'Losing tension through the middle'],
  },
  plank_shoulder_tap: {
    id: 'plank_shoulder_tap',
    name: 'Plank Shoulder Tap',
    bodyParts: ['core', 'upper-body', 'full-body'],
    goals: ['strength', 'hiit'],
    equipment: ['Bodyweight'],
    summary: 'A plank variation that trains anti-rotation control and shoulder stability.',
    setup: 'Start in a strong high plank with feet slightly wider than normal.',
    howTo: [
      'Tap one hand to the opposite shoulder without letting your hips sway.',
      'Place that hand down with control and switch sides.',
      'Keep your body square to the floor the whole time.',
    ],
    coachingCues: ['Quiet hips', 'Push the floor away', 'Move slower than you think'],
    commonMistakes: ['Rocking side to side', 'Feet too narrow', 'Holding the breath'],
  },
  russian_twist: {
    id: 'russian_twist',
    name: 'Russian Twist',
    bodyParts: ['core'],
    goals: ['sculpt', 'hiit'],
    equipment: ['Bodyweight or light dumbbell'],
    summary: 'A rotational core move for obliques and trunk endurance.',
    setup: 'Sit tall with knees bent and lean back just enough to feel your core engage.',
    howTo: [
      'Keep your chest lifted and rotate your ribs side to side.',
      'Move from your torso instead of just swinging your arms.',
      'Tap lightly on each side while staying balanced.',
    ],
    coachingCues: ['Stay tall', 'Rotate the rib cage', 'Slow the tap'],
    commonMistakes: ['Rounding the spine', 'Swinging only the hands', 'Collapsing through the chest'],
  },
  mountain_climber: {
    id: 'mountain_climber',
    name: 'Mountain Climber',
    bodyParts: ['core', 'full-body'],
    goals: ['hiit', 'sculpt'],
    equipment: ['Bodyweight'],
    summary: 'A fast-paced conditioning move that lights up the core and shoulders.',
    setup: 'Start in a high plank with shoulders stacked over wrists.',
    howTo: [
      'Drive one knee in toward your chest while the other leg stays long.',
      'Switch legs smoothly while maintaining a stable plank line.',
      'Move quickly only if you can keep your hips level.',
    ],
    coachingCues: ['Shoulders steady', 'Quick feet, quiet hips', 'Knees track straight in'],
    commonMistakes: ['Bouncing the hips', 'Hands drifting back', 'Running faster than control allows'],
  },
  skater_hop: {
    id: 'skater_hop',
    name: 'Skater Hop',
    bodyParts: ['lower-body', 'glutes', 'full-body'],
    goals: ['hiit', 'sculpt'],
    equipment: ['Bodyweight'],
    summary: 'A lateral power move that trains agility, glutes, and heart rate.',
    setup: 'Stand on one leg with a soft knee and the other foot hovering behind you.',
    howTo: [
      'Hop side to side and land softly on one leg each rep.',
      'Reach the free leg behind you for balance.',
      'Stick each landing before you rebound.',
    ],
    coachingCues: ['Land quietly', 'Use your arms', 'Push side to side, not just up and down'],
    commonMistakes: ['Losing balance on landing', 'Letting the knee cave in', 'Rushing the change of direction'],
  },
  high_knees: {
    id: 'high_knees',
    name: 'High Knees',
    bodyParts: ['full-body', 'core'],
    goals: ['hiit'],
    equipment: ['Bodyweight'],
    summary: 'A simple cardio move that raises your heart rate fast.',
    setup: 'Stand tall with elbows bent at your sides.',
    howTo: [
      'Drive one knee up toward hip height, then switch quickly.',
      'Pump your arms to match the leg drive.',
      'Stay light on your feet and keep your chest tall.',
    ],
    coachingCues: ['Knees up, chest up', 'Light feet', 'Arms set the rhythm'],
    commonMistakes: ['Leaning back', 'Letting knees stay low', 'Landing heavily'],
  },
  lateral_band_walk: {
    id: 'lateral_band_walk',
    name: 'Lateral Band Walk',
    bodyParts: ['glutes', 'lower-body'],
    goals: ['strength', 'sculpt'],
    equipment: ['Mini band'],
    summary: 'A glute activation move that wakes up the hips before harder work.',
    setup: 'Place a band above your knees or around your ankles and hinge into an athletic stance.',
    howTo: [
      'Step sideways with control while keeping constant band tension.',
      'Bring the trailing foot in without letting the knees cave in.',
      'Continue for the prescribed distance, then switch directions.',
    ],
    coachingCues: ['Stay low', 'Keep tension on the band', 'Toes point forward'],
    commonMistakes: ['Standing up too tall', 'Snapping the trail leg in', 'Feet turning out'],
  },
  bird_dog: {
    id: 'bird_dog',
    name: 'Bird Dog',
    bodyParts: ['core', 'mobility'],
    goals: ['strength', 'mobility'],
    equipment: ['Bodyweight'],
    summary: 'A low-impact drill for spinal stability, glutes, and shoulder control.',
    setup: 'Start on hands and knees with wrists under shoulders and knees under hips.',
    howTo: [
      'Reach one arm forward and the opposite leg back while keeping hips level.',
      'Pause briefly with a long spine and steady core.',
      'Return to center before switching sides.',
    ],
    coachingCues: ['Reach long', 'Keep hips square', 'Move slowly'],
    commonMistakes: ['Arching the back', 'Opening the hips', 'Throwing the limbs up too high'],
  },
  cat_cow_flow: {
    id: 'cat_cow_flow',
    name: 'Cat-Cow Flow',
    bodyParts: ['mobility', 'core'],
    goals: ['mobility'],
    equipment: ['Bodyweight'],
    summary: 'A breath-led spinal mobility move that helps you reset posture.',
    setup: 'Begin on hands and knees with a neutral spine.',
    howTo: [
      'Inhale as you arch your chest forward and lift your gaze slightly.',
      'Exhale as you round your spine and pull your ribs up away from the floor.',
      'Move slowly and let your breath set the pace.',
    ],
    coachingCues: ['Breathe into every rep', 'Move through the spine', 'Keep the pace smooth'],
    commonMistakes: ['Rushing the breath', 'Only moving the neck', 'Locking the elbows'],
  },
  worlds_greatest_stretch: {
    id: 'worlds_greatest_stretch',
    name: "World's Greatest Stretch",
    bodyParts: ['mobility', 'full-body'],
    goals: ['mobility'],
    equipment: ['Bodyweight'],
    summary: 'A full-body mobility drill for hips, thoracic spine, and hamstrings.',
    setup: 'Step into a runner lunge with both hands on the floor inside your front foot.',
    howTo: [
      'Drop your back knee if needed and open your chest by reaching one arm to the ceiling.',
      'Return the hand to the floor and gently rock your hips back to lengthen the front leg.',
      'Repeat on one side before switching.',
    ],
    coachingCues: ['Long spine', 'Breathe into the twist', 'Move with control'],
    commonMistakes: ['Collapsing on the front leg', 'Forcing range of motion', 'Holding the breath'],
  },
}

export const WORKOUT_BLOCKS: WorkoutBlock[] = [
  {
    id: 'full_body_express',
    title: 'Full Body Express',
    summary: 'A quick total-body session that balances strength, core, and conditioning.',
    bodyPart: 'full-body',
    goal: 'strength',
    durationMinutes: 20,
    equipment: ['Dumbbells', 'Bodyweight'],
    level: 'beginner',
    trainerNote: 'Move with intention and leave one solid rep in the tank on every set.',
    exercises: [
      { exerciseId: 'goblet_squat', prescription: '3 sets of 10 reps', rest: '45 sec' },
      { exerciseId: 'bent_over_row', prescription: '3 sets of 10 reps', rest: '45 sec' },
      { exerciseId: 'push_up', prescription: '3 sets of 8 reps', rest: '45 sec', note: 'Elevate hands if needed.' },
      { exerciseId: 'dead_bug', prescription: '2 sets of 8 reps per side', rest: '30 sec' },
    ],
  },
  {
    id: 'lower_body_strength',
    title: 'Lower Body Strength Builder',
    summary: 'A focused leg and glute block for stronger squats, hinges, and lunges.',
    bodyPart: 'lower-body',
    goal: 'strength',
    durationMinutes: 30,
    equipment: ['Dumbbells', 'Mini band'],
    level: 'intermediate',
    trainerNote: 'Take your time on the lowering phase and own every position.',
    exercises: [
      { exerciseId: 'goblet_squat', prescription: '4 sets of 8 reps', rest: '60 sec' },
      { exerciseId: 'romanian_deadlift', prescription: '4 sets of 10 reps', rest: '60 sec' },
      { exerciseId: 'reverse_lunge', prescription: '3 sets of 8 reps per side', rest: '45 sec' },
      { exerciseId: 'lateral_band_walk', prescription: '2 sets of 12 steps each direction', rest: '30 sec' },
    ],
  },
  {
    id: 'upper_body_sculpt',
    title: 'Upper Body Sculpt',
    summary: 'Press, pull, and brace through a clean upper-body sculpt session.',
    bodyPart: 'upper-body',
    goal: 'sculpt',
    durationMinutes: 20,
    equipment: ['Dumbbells', 'Bodyweight'],
    level: 'beginner',
    trainerNote: 'Use crisp form and smooth tempo instead of chasing speed.',
    exercises: [
      { exerciseId: 'shoulder_press', prescription: '3 sets of 10 reps', rest: '45 sec' },
      { exerciseId: 'bent_over_row', prescription: '3 sets of 12 reps', rest: '45 sec' },
      { exerciseId: 'push_up', prescription: '3 sets of 6 to 10 reps', rest: '45 sec' },
      { exerciseId: 'plank_shoulder_tap', prescription: '2 sets of 10 taps per side', rest: '30 sec' },
    ],
  },
  {
    id: 'glute_focus_burn',
    title: 'Glute Focus Burn',
    summary: 'Target the glutes with a clean activation-to-strength progression.',
    bodyPart: 'glutes',
    goal: 'sculpt',
    durationMinutes: 25,
    equipment: ['Mini band', 'Dumbbell'],
    level: 'beginner',
    trainerNote: 'Keep tension through the outer hips and do not rush the top squeeze.',
    exercises: [
      { exerciseId: 'lateral_band_walk', prescription: '2 sets of 12 steps each direction', rest: '20 sec' },
      { exerciseId: 'glute_bridge', prescription: '3 sets of 12 reps', rest: '30 sec' },
      { exerciseId: 'reverse_lunge', prescription: '3 sets of 10 reps per side', rest: '45 sec' },
      { exerciseId: 'romanian_deadlift', prescription: '3 sets of 10 reps', rest: '45 sec' },
    ],
  },
  {
    id: 'core_igniter',
    title: 'Core Igniter',
    summary: 'A short but focused midline session for anti-rotation and deep-core control.',
    bodyPart: 'core',
    goal: 'strength',
    durationMinutes: 15,
    equipment: ['Bodyweight'],
    level: 'beginner',
    trainerNote: 'Slow down, breathe out fully, and keep the movement quality high.',
    exercises: [
      { exerciseId: 'dead_bug', prescription: '3 sets of 8 reps per side', rest: '25 sec' },
      { exerciseId: 'plank_shoulder_tap', prescription: '3 sets of 8 taps per side', rest: '25 sec' },
      { exerciseId: 'russian_twist', prescription: '3 sets of 16 total reps', rest: '25 sec' },
      { exerciseId: 'bird_dog', prescription: '2 sets of 8 reps per side', rest: '20 sec' },
    ],
  },
  {
    id: 'hiit_cardio_burst',
    title: 'HIIT Cardio Burst',
    summary: 'A low-equipment conditioning block for energy, sweat, and athletic rhythm.',
    bodyPart: 'full-body',
    goal: 'hiit',
    durationMinutes: 15,
    equipment: ['Bodyweight'],
    level: 'intermediate',
    trainerNote: 'Work hard, but keep your landings quiet and your posture tall.',
    exercises: [
      { exerciseId: 'high_knees', prescription: '4 rounds of 30 sec on', rest: '20 sec' },
      { exerciseId: 'mountain_climber', prescription: '4 rounds of 30 sec on', rest: '20 sec' },
      { exerciseId: 'skater_hop', prescription: '4 rounds of 30 sec on', rest: '20 sec' },
      { exerciseId: 'plank_shoulder_tap', prescription: '2 rounds of 20 sec on', rest: '20 sec' },
    ],
  },
  {
    id: 'mobility_reset',
    title: 'Mobility Reset',
    summary: 'A recovery-first flow for hips, spine, shoulders, and better movement quality.',
    bodyPart: 'mobility',
    goal: 'mobility',
    durationMinutes: 15,
    equipment: ['Bodyweight'],
    level: 'beginner',
    trainerNote: 'Breathe slowly and treat each rep like a reset, not a race.',
    exercises: [
      { exerciseId: 'cat_cow_flow', prescription: '2 rounds of 6 slow reps', rest: '15 sec' },
      { exerciseId: 'worlds_greatest_stretch', prescription: '2 rounds of 4 reps per side', rest: '15 sec' },
      { exerciseId: 'bird_dog', prescription: '2 rounds of 6 reps per side', rest: '15 sec' },
      { exerciseId: 'glute_bridge', prescription: '2 rounds of 10 reps', rest: '20 sec' },
    ],
  },
  {
    id: 'power_and_posture',
    title: 'Power and Posture',
    summary: 'A longer full-body circuit that blends pulls, presses, legs, and core.',
    bodyPart: 'full-body',
    goal: 'strength',
    durationMinutes: 35,
    equipment: ['Dumbbells', 'Bodyweight'],
    level: 'intermediate',
    trainerNote: 'Own your setup on every lift and keep your upper back active.',
    exercises: [
      { exerciseId: 'romanian_deadlift', prescription: '4 sets of 8 reps', rest: '60 sec' },
      { exerciseId: 'bent_over_row', prescription: '4 sets of 10 reps', rest: '45 sec' },
      { exerciseId: 'shoulder_press', prescription: '3 sets of 8 reps', rest: '45 sec' },
      { exerciseId: 'reverse_lunge', prescription: '3 sets of 8 reps per side', rest: '45 sec' },
      { exerciseId: 'dead_bug', prescription: '2 sets of 8 reps per side', rest: '30 sec' },
    ],
  },
  {
    id: 'desk_reset_flow',
    title: 'Desk Reset Flow',
    summary: 'A quick mobility break for posture, low back stiffness, and hips.',
    bodyPart: 'mobility',
    goal: 'mobility',
    durationMinutes: 10,
    equipment: ['Bodyweight'],
    level: 'beginner',
    trainerNote: 'This is the best choice when you need something restorative and realistic.',
    exercises: [
      { exerciseId: 'cat_cow_flow', prescription: '90 seconds total', rest: 'none' },
      { exerciseId: 'worlds_greatest_stretch', prescription: '3 reps per side', rest: '10 sec' },
      { exerciseId: 'bird_dog', prescription: '6 reps per side', rest: '15 sec' },
    ],
  },
]

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

export function getBodyPartLabel(bodyPart: WorkoutBodyPart) {
  return FOCUS_OPTIONS.find((option) => option.value === bodyPart)?.label || bodyPart
}

export function getGoalLabel(goal: WorkoutGoal) {
  return GOAL_OPTIONS.find((option) => option.value === goal)?.label || goal
}

export function getExerciseById(exerciseId: string) {
  return EXERCISE_LIBRARY[exerciseId]
}

export function getWorkoutBlocks(bodyPart: WorkoutBodyPart | 'all' = 'all') {
  return bodyPart === 'all'
    ? WORKOUT_BLOCKS
    : WORKOUT_BLOCKS.filter((block) => block.bodyPart === bodyPart || block.bodyPart === 'full-body')
}

function toSection(block: WorkoutBlock): GuidedWorkoutSection {
  return {
    id: block.id,
    title: block.title,
    summary: block.summary,
    durationMinutes: block.durationMinutes,
    exercises: block.exercises
      .map((plan) => {
        const exercise = getExerciseById(plan.exerciseId)
        if (!exercise) return null
        return {
          ...plan,
          exercise,
        }
      })
      .filter(Boolean) as GuidedWorkoutSection['exercises'],
  }
}

function buildWorkout(blocks: WorkoutBlock[], source: WorkoutSource, title: string, summary: string, trainerNote: string): GuidedWorkout {
  return {
    id: `${source}-${blocks.map((block) => block.id).join('-')}`,
    title,
    summary,
    source,
    durationMinutes: blocks.reduce((total, block) => total + block.durationMinutes, 0),
    goal: blocks[0]?.goal || 'strength',
    bodyParts: unique(blocks.map((block) => block.bodyPart)),
    equipment: unique(blocks.flatMap((block) => block.equipment)),
    trainerNote,
    sections: blocks.map(toSection),
  }
}

function getMonthlyTheme(date = new Date()) {
  return MONTHLY_THEMES[date.getMonth()] || MONTHLY_THEMES[0]
}

export function getWorkoutOfTheDay(date = new Date()) {
  const theme = getMonthlyTheme(date)
  const workoutIndex = ((date.getMonth() * 31) + date.getDate()) % WORKOUT_BLOCKS.length
  const block = WORKOUT_BLOCKS[workoutIndex]

  return {
    ...buildWorkout(
      [block],
      'daily',
      `Workout of the Day: ${block.title}`,
      `${theme.summary} Today's guided pick leans into ${getBodyPartLabel(block.bodyPart).toLowerCase()} work with a ${getGoalLabel(block.goal).toLowerCase()} feel.`,
      block.trainerNote
    ),
    monthlyTheme: theme,
  }
}

type GuidedWorkoutPreferences = {
  minutes: number
  bodyPart: WorkoutBodyPart
  goal: WorkoutGoal
}

function scoreBlock(block: WorkoutBlock, preferences: GuidedWorkoutPreferences) {
  let score = 0

  if (block.bodyPart === preferences.bodyPart) score += 9
  else if (block.bodyPart === 'full-body' || preferences.bodyPart === 'full-body') score += 5

  if (block.goal === preferences.goal) score += 8
  else if (preferences.goal === 'mobility' && block.goal === 'strength') score += 1

  const durationGap = Math.abs(block.durationMinutes - preferences.minutes)
  score += Math.max(0, 8 - durationGap)

  if (block.level === 'beginner') score += 1

  return score
}

export function generateWorkoutFromPreferences(preferences: GuidedWorkoutPreferences) {
  const ranked = [...WORKOUT_BLOCKS].sort(
    (a, b) => scoreBlock(b, preferences) - scoreBlock(a, preferences)
  )

  const selected: WorkoutBlock[] = []
  let totalMinutes = 0

  for (const candidate of ranked) {
    if (selected.find((block) => block.id === candidate.id)) continue

    const isCompatibleFocus =
      candidate.bodyPart === preferences.bodyPart ||
      candidate.bodyPart === 'full-body' ||
      preferences.bodyPart === 'full-body' ||
      (preferences.bodyPart === 'glutes' && candidate.bodyPart === 'lower-body') ||
      (preferences.bodyPart === 'lower-body' && candidate.bodyPart === 'glutes')

    const isCompatibleGoal =
      candidate.goal === preferences.goal ||
      (preferences.goal === 'strength' && candidate.goal === 'sculpt') ||
      (preferences.goal === 'sculpt' && candidate.goal === 'strength') ||
      (preferences.goal === 'mobility' && candidate.goal === 'strength')

    if (!selected.length || (isCompatibleFocus && isCompatibleGoal)) {
      selected.push(candidate)
      totalMinutes += candidate.durationMinutes
    }

    if (totalMinutes >= Math.max(10, preferences.minutes - 5)) {
      break
    }
  }

  const blocks = selected.length ? selected : [WORKOUT_BLOCKS[0]]
  const summary = `Built around ${preferences.minutes} minutes, ${getBodyPartLabel(preferences.bodyPart).toLowerCase()} focus, and a ${getGoalLabel(preferences.goal).toLowerCase()} session.`
  const trainerNote = blocks.map((block) => block.trainerNote).join(' ')

  return buildWorkout(
    blocks,
    'guided',
    `${getGoalLabel(preferences.goal)} ${getBodyPartLabel(preferences.bodyPart)} Session`,
    summary,
    trainerNote
  )
}

export function buildCustomWorkoutFromBlocks(blockIds: string[]) {
  const blocks = blockIds
    .map((blockId) => WORKOUT_BLOCKS.find((block) => block.id === blockId))
    .filter(Boolean) as WorkoutBlock[]

  if (!blocks.length) {
    return getWorkoutOfTheDay()
  }

  return buildWorkout(
    blocks,
    'custom',
    'Custom Workout Stack',
    'A mix-and-match workout assembled from the blocks you selected in the catalog.',
    'Start with the first block, rest for 60 seconds between sections, and keep your form sharp.'
  )
}

export function generateSurpriseWorkout() {
  const randomIndex = Math.floor(Math.random() * WORKOUT_BLOCKS.length)
  const primary = WORKOUT_BLOCKS[randomIndex]
  const complement = WORKOUT_BLOCKS.find(
    (block) =>
      block.id !== primary.id &&
      block.goal === primary.goal &&
      block.durationMinutes <= 20 &&
      block.bodyPart !== primary.bodyPart
  )

  const blocks = complement && primary.durationMinutes < 25 ? [primary, complement] : [primary]

  return buildWorkout(
    blocks,
    'random',
    `Surprise Me: ${primary.title}`,
    'A randomly generated workout pulled from your guided library. Great for the days you want momentum without overthinking it.',
    'Trust the plan, move with clean reps, and swap any exercise that does not feel right today.'
  )
}

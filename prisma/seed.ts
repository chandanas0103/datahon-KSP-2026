import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const stations = [
  { stationCode: 'PS-WF-01', name: 'Whitefield Police Station', area: 'Whitefield', district: 'Bangalore Urban', address: 'Whitefield Main Road, Bangalore - 560066', phone: '080-28451234' },
  { stationCode: 'PS-IN-01', name: 'Indiranagar Police Station', area: 'Indiranagar', district: 'Bangalore Urban', address: '100 Feet Road, Indiranagar, Bangalore - 560038', phone: '080-25211234' },
  { stationCode: 'PS-KR-01', name: 'Koramangala Police Station', area: 'Koramangala', district: 'Bangalore Urban', address: 'Koramangala 4th Block, Bangalore - 560034', phone: '080-25521234' },
  { stationCode: 'PS-HS-01', name: 'HSR Layout Police Station', area: 'HSR Layout', district: 'Bangalore Urban', address: 'HSR Layout Sector 2, Bangalore - 560102', phone: '080-22501234' },
  { stationCode: 'PS-JP-01', name: 'JP Nagar Police Station', area: 'JP Nagar', district: 'Bangalore Urban', address: 'JP Nagar 7th Phase, Bangalore - 560078', phone: '080-26581234' },
  { stationCode: 'PS-BT-01', name: 'BTM Layout Police Station', area: 'BTM Layout', district: 'Bangalore Urban', address: 'BTM 2nd Stage, Bangalore - 560076', phone: '080-26681234' },
  { stationCode: 'PS-MR-01', name: 'Marathahalli Police Station', area: 'Marathahalli', district: 'Bangalore Urban', address: 'Marathahalli Main Road, Bangalore - 560037', phone: '080-25231234' },
  { stationCode: 'PS-EC-01', name: 'Electronic City Police Station', area: 'Electronic City', district: 'Bangalore Urban', address: 'Electronic City Phase 1, Bangalore - 560100', phone: '080-28521234' },
  { stationCode: 'PS-SR-01', name: 'Sarjapur Road Police Station', area: 'Sarjapur Road', district: 'Bangalore Urban', address: 'Sarjapur Road, Bangalore - 560035', phone: '080-22561234' },
  { stationCode: 'PS-RJ-01', name: 'Rajajinagar Police Station', area: 'Rajajinagar', district: 'Bangalore Urban', address: 'Rajajinagar 1st Block, Bangalore - 560010', phone: '080-23301234' },
]

const officers = [
  { badgeNumber: 'BLR-001', name: 'Ravi Kumar', rank: 'Inspector', stationCode: 'PS-WF-01', phone: '9876500101' },
  { badgeNumber: 'BLR-002', name: 'Priya Sharma', rank: 'Sub-Inspector', stationCode: 'PS-WF-01', phone: '9876500102' },
  { badgeNumber: 'BLR-003', name: 'Anand Reddy', rank: 'Inspector', stationCode: 'PS-IN-01', phone: '9876500103' },
  { badgeNumber: 'BLR-004', name: 'Sunita Devi', rank: 'Sub-Inspector', stationCode: 'PS-IN-01', phone: '9876500104' },
  { badgeNumber: 'BLR-005', name: 'Mohammed Irfan', rank: 'Inspector', stationCode: 'PS-KR-01', phone: '9876500105' },
  { badgeNumber: 'BLR-006', name: 'Lakshmi Naidu', rank: 'Sub-Inspector', stationCode: 'PS-KR-01', phone: '9876500106' },
  { badgeNumber: 'BLR-007', name: 'Venkatesh Gowda', rank: 'Inspector', stationCode: 'PS-HS-01', phone: '9876500107' },
  { badgeNumber: 'BLR-008', name: 'Kavitha Rao', rank: 'Sub-Inspector', stationCode: 'PS-HS-01', phone: '9876500108' },
  { badgeNumber: 'BLR-009', name: 'Suresh Babu', rank: 'Inspector', stationCode: 'PS-JP-01', phone: '9876500109' },
  { badgeNumber: 'BLR-010', name: 'Deepa Mary', rank: 'Sub-Inspector', stationCode: 'PS-JP-01', phone: '9876500110' },
  { badgeNumber: 'BLR-011', name: 'Naveen Kumar', rank: 'Inspector', stationCode: 'PS-BT-01', phone: '9876500111' },
  { badgeNumber: 'BLR-012', name: 'Geetha Lakshmi', rank: 'Sub-Inspector', stationCode: 'PS-BT-01', phone: '9876500112' },
  { badgeNumber: 'BLR-013', name: 'Arun Prasad', rank: 'Inspector', stationCode: 'PS-MR-01', phone: '9876500113' },
  { badgeNumber: 'BLR-014', name: 'Bhagya Sri', rank: 'Sub-Inspector', stationCode: 'PS-MR-01', phone: '9876500114' },
  { badgeNumber: 'BLR-015', name: 'Rajesh M', rank: 'Inspector', stationCode: 'PS-EC-01', phone: '9876500115' },
  { badgeNumber: 'BLR-016', name: 'Pavithra K', rank: 'Sub-Inspector', stationCode: 'PS-EC-01', phone: '9876500116' },
  { badgeNumber: 'BLR-017', name: 'Krishna Murthy', rank: 'Inspector', stationCode: 'PS-SR-01', phone: '9876500117' },
  { badgeNumber: 'BLR-018', name: 'Anjali Gupta', rank: 'Sub-Inspector', stationCode: 'PS-SR-01', phone: '9876500118' },
  { badgeNumber: 'BLR-019', name: 'Manoj Tiwari', rank: 'Inspector', stationCode: 'PS-RJ-01', phone: '9876500119' },
  { badgeNumber: 'BLR-020', name: 'Rekha S', rank: 'Sub-Inspector', stationCode: 'PS-RJ-01', phone: '9876500120' },
]

const crimeTypes = [
  { name: 'Theft', category: 'Property Crime', isBailable: true, description: 'Unlawful taking of property' },
  { name: 'Burglary', category: 'Property Crime', isBailable: false, description: 'Illegal entry with intent to commit theft' },
  { name: 'Robbery', category: 'Violent Crime', isBailable: false, description: 'Theft using force or threat' },
  { name: 'Assault', category: 'Violent Crime', isBailable: false, description: 'Physical attack on a person' },
  { name: 'Cheating', category: 'Fraud', isBailable: true, description: 'Deception for financial gain' },
  { name: 'Cyber Crime', category: 'Cyber Crime', isBailable: true, description: 'Crimes involving computers or networks' },
  { name: 'Vehicle Theft', category: 'Property Crime', isBailable: true, description: 'Stealing of motor vehicles' },
  { name: 'Chain Snatching', category: 'Property Crime', isBailable: true, description: 'Snatching jewelry from victims in public' },
  { name: 'Murder', category: 'Violent Crime', isBailable: false, description: 'Unlawful killing of a person' },
  { name: 'Rape', category: 'Violent Crime', isBailable: false, description: 'Non-consensual sexual act' },
  { name: 'Kidnapping', category: 'Violent Crime', isBailable: false, description: 'Unlawful abduction of a person' },
  { name: 'Fraud', category: 'Fraud', isBailable: true, description: 'Intentional deception for personal gain' },
  { name: 'Vandalism', category: 'Property Crime', isBailable: true, description: 'Willful destruction of property' },
  { name: 'Domestic Violence', category: 'Personal Crime', isBailable: true, description: 'Violence or abuse in a domestic setting' },
  { name: 'Drug Offense', category: 'Narcotics', isBailable: false, description: 'Illegal possession or trafficking of drugs' },
]

const locations = {
  'Whitefield': ['ITPL Road', 'Viveknagar', 'Ramagondanahalli', 'Siddapura', 'Hope Farm Junction', 'Whitefield Main Road', 'Maheshwaram Nagar', 'Thubarahalli'],
  'Indiranagar': ['100 Feet Road', 'BMRCL Layout', 'CMH Road', 'HAL 2nd Stage', 'Defence Colony', 'Jeevanbhimanagar', 'New Thippasandra', 'Chinnappanahalli'],
  'Koramangala': ['4th Block', '5th Block', '1st Block', '6th Block', 'ST Bed Layout', 'Jakkasandra', 'Siddapura', 'Koramangala Club Road'],
  'HSR Layout': ['Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Sector 5', 'Sector 7', 'Bommanahalli', 'Agara'],
  'JP Nagar': ['1st Phase', '2nd Phase', '4th Phase', '6th Phase', '7th Phase', '8th Phase', 'Jayanagar 9th Block', 'Puttenahalli'],
  'BTM Layout': ['1st Stage', '2nd Stage', '2nd Stage Layout', 'Mico Layout', 'Arekere', 'Bannerghatta Road', 'Hulimavu', 'Doddakannelli'],
  'Marathahalli': ['Marathahalli Bridge', 'Kundanahalli', 'Kariyanapalya', 'Garudachar Palya', 'Chellikere', 'Varthur Road', 'Thubarahalli', 'Munnekollala'],
  'Electronic City': ['Phase 1', 'Phase 2', 'Doddathoguru', 'Konappana Agrahara', 'Neeladri Nagar', 'Hosur Road', 'Naganathapura', 'Hirehalli'],
  'Sarjapur Road': ['Kaikondrahalli', 'Chikka Begur', 'Bellandur', 'Harlur', 'Doddenakundi', 'Gunjur', 'Somasundarapalya', 'Munnekollal'],
  'Rajajinagar': ['1st Block', '2nd Block', '3rd Block', 'Nagarabhavi', 'Basaveshwara Nagar', 'Mahalaxmi Layout', 'Vijayanagar', 'Chord Road'],
}

const firstNames = ['Ramesh', 'Suresh', 'Mahesh', 'Kiran', 'Vijay', 'Arjun', 'Sanjay', 'Deepak', 'Rahul', 'Amit', 'Priya', 'Sunita', 'Lakshmi', 'Kavitha', 'Deepa', 'Geetha', 'Pavithra', 'Anjali', 'Rekha', 'Bhagya', 'Mohammed', 'Irfan', 'Venkatesh', 'Krishna', 'Ravi', 'Anand', 'Naveen', 'Rajesh', 'Arun', 'Manoj', 'Sheela', 'Meena', 'Kamala', 'Usha', 'Padma', 'Shanti', 'Gowri', 'Nandini', 'Swathi', 'Divya']
const lastNames = ['Kumar', 'Sharma', 'Reddy', 'Gowda', 'Rao', 'Naidu', 'Babu', 'Prasad', 'Murthy', 'Tiwari', 'Gupta', 'Singh', 'Patil', 'Das', 'Hegde', 'Shetty', 'Pai', 'Kulkarni', 'Bhat', 'Acharya']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(start: Date, end: Date): Date {
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime())
  return new Date(time)
}

function randomTime(): string {
  const h = Math.floor(Math.random() * 24).toString().padStart(2, '0')
  const m = Math.floor(Math.random() * 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

const statuses = ['Open', 'Under Investigation', 'Closed', 'Charge Sheeted', 'Acquitted', 'Compromised']
const priorities = ['Low', 'Medium', 'High', 'Critical']

const caseDescriptions = [
  'Complainant reported that unknown accused stole their two-wheeler parked outside their residence during night hours.',
  'Victim filed a complaint regarding online fraud where the accused posing as a bank official obtained OTP and transferred funds.',
  'Chain snatching incident near the bus stop. Two unidentified individuals on a motorcycle snatched the gold chain and fled.',
  'Burglary reported at the commercial establishment during the weekend. Cash and electronic items worth several lakhs were stolen.',
  'Victim was assaulted by a group of individuals following a road rage incident near the traffic signal.',
  'Cyber crime complaint - victim received phishing links via SMS and lost access to their bank account.',
  'House break-in reported when the family was away on vacation. Jewelry and cash were stolen.',
  'Vehicle theft from the parking lot of a shopping mall. CCTV footage is being analyzed.',
  'Complainant was cheated by a fake job portal that collected registration fees and disappeared.',
  'Domestic violence complaint filed by the wife against her husband under Section 498A.',
  'Murder reported - body found near the lake. Investigation is ongoing, forensic team has been called.',
  'Kidnapping of a minor reported from near the school premises. Search operations are underway.',
  'Drug peddling reported in the apartment complex. Narcotics worth significant amount were seized.',
  'Vandalism at the public park - benches and lighting fixtures were damaged overnight.',
  'Cheating case - accused collected advance payment for a flat and did not deliver the property.',
  'Assault with a deadly weapon reported during a late-night altercation outside a bar.',
  'Identity theft complaint - victim discovered multiple credit cards were opened in their name.',
  'Robbery at a convenience store. Armed individuals threatened the staff and fled with cash.',
  'Stalking and harassment complaint by a college student against an unidentified individual.',
  'Fraudulent insurance claim reported by the insurance company against the policy holder.',
]

async function seed() {
  console.log('Seeding database...')

  // Create stations
  const stationMap = new Map<string, string>()
  for (const s of stations) {
    const station = await prisma.policeStation.create({ data: s })
    stationMap.set(s.stationCode, station.id)
  }
  console.log(`Created ${stations.length} stations`)

  // Create officers
  const officerMap = new Map<string, string>()
  for (const o of officers) {
    const officer = await prisma.officer.create({
      data: {
        badgeNumber: o.badgeNumber,
        name: o.name,
        rank: o.rank,
        phone: o.phone,
        stationId: stationMap.get(o.stationCode)!,
      },
    })
    officerMap.set(o.badgeNumber, officer.id)
  }
  console.log(`Created ${officers.length} officers`)

  // Create crime types
  const crimeTypeMap = new Map<string, string>()
  for (const ct of crimeTypes) {
    const crimeType = await prisma.crimeType.create({ data: ct })
    crimeTypeMap.set(ct.name, crimeType.id)
  }
  console.log(`Created ${crimeTypes.length} crime types`)

  // Create cases - generate ~200 cases spanning the last 2 years
  const stationCodes = Object.keys(locations)
  const now = new Date()
  const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1)

  for (let i = 0; i < 200; i++) {
    const area = randomItem(stationCodes)
    const loc = randomItem(locations[area as keyof typeof locations])
    const stationCode = stations.find(s => s.area === area)!.stationCode
    const crimeTypeObj = randomItem(crimeTypes)
    const crimeTypeName = crimeTypeObj.name
    const status = randomItem(statuses)
    const priority = randomItem(priorities)
    const incidentDate = randomDate(twoYearsAgo, now)
    const filedDate = new Date(incidentDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000)

    const caseData: any = {
      firNumber: `FIR/BLR/${incidentDate.getFullYear()}/${String(i + 1).padStart(4, '0')}`,
      crimeTypeId: crimeTypeMap.get(crimeTypeName)!,
      stationId: stationMap.get(stationCode)!,
      status,
      priority,
      filedDate,
      incidentDate,
      incidentTime: randomTime(),
      description: randomItem(caseDescriptions),
      location: loc,
      latitude: 12.9 + (Math.random() - 0.5) * 0.2,
      longitude: 77.5 + (Math.random() - 0.5) * 0.3,
      victimName: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
      victimAge: 18 + Math.floor(Math.random() * 55),
      victimGender: Math.random() > 0.35 ? 'Male' : 'Female',
    }

    // 60% chance of having a suspect
    if (Math.random() > 0.4) {
      caseData.suspectName = `${randomItem(firstNames)} ${randomItem(lastNames)}`
      caseData.suspectAge = 18 + Math.floor(Math.random() * 45)
      caseData.suspectGender = Math.random() > 0.3 ? 'Male' : 'Female'
    }

    // Assign to officer if not Closed/Acquitted
    if (status !== 'Closed' && status !== 'Acquitted') {
      const stationOfficers = officers.filter(o => o.stationCode === stationCode)
      const officer = randomItem(stationOfficers)
      if (officer) {
        caseData.assignedToId = officerMap.get(officer.badgeNumber)
      }
    }

    // Resolved date for closed cases
    if (status === 'Closed' || status === 'Charge Sheeted' || status === 'Acquitted') {
      const resolveDays = Math.floor(Math.random() * 180) + 7
      caseData.resolvedDate = new Date(filedDate.getTime() + resolveDays * 24 * 60 * 60 * 1000)
    }

    await prisma.case.create({ data: caseData })
  }

  console.log('Created 200 cases')
  console.log('Seed complete!')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
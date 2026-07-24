import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIRST_NAMES = [
  'Ramesh', 'Suresh', 'Anand', 'Vijay', 'Priya', 'Anitha', 'Kavitha', 'Manjunath', 'Ganesh', 'Venkatesh',
  'Lakshmi', 'Sunil', 'Rajesh', 'Deepak', 'Meena', 'Shruti', 'Preethi', 'Kiran', 'Santhosh', 'Praveen',
  'Naveen', 'Bharath', 'Divya', 'Asha', 'Shwetha', 'Arun', 'Vinay', 'Chethan', 'Dinesh', 'Harish'
]

const LAST_NAMES = [
  'Kumar', 'Gowda', 'Reddy', 'Rao', 'Shetty', 'Nair', 'Hegde', 'Sharma', 'Patil', 'Babu',
  'Prasad', 'Murthy', 'Deshmukh', 'Naidu', 'Swamy', 'Joshi', 'Kulkarni', 'Pujari', 'Nayak', 'Bhat'
]

const CRIME_FACTS = [
  { facts: "Complainant reported theft of gold chain while traveling in public transport.", act: "IPC", sec: 379, subHead: 1, majorHead: 1, category: 1, gravity: 2 },
  { facts: "Cyber fraud where victim received a fraudulent bank link on WhatsApp and lost money.", act: "IT_ACT", sec: 66, subHead: 3, majorHead: 3, category: 1, gravity: 2 },
  { facts: "House break theft committed at night while owners were away on vacation.", act: "IPC", sec: 379, subHead: 2, majorHead: 1, category: 1, gravity: 2 },
  { facts: "Armed robbery near tech park road during night hours.", act: "IPC", sec: 379, subHead: 4, majorHead: 1, category: 1, gravity: 1 },
  { facts: "Physical assault following a heated argument over vehicle parking space.", act: "IPC", sec: 302, subHead: 5, majorHead: 2, category: 1, gravity: 1 },
  { facts: "Two-wheeler motor vehicle theft parked outside apartment complex.", act: "IPC", sec: 379, subHead: 1, majorHead: 1, category: 1, gravity: 2 },
  { facts: "Extortion attempt by miscreants demanding money from shopkeeper.", act: "IPC", sec: 420, subHead: 3, majorHead: 3, category: 1, gravity: 2 },
  { facts: "Narcotics substance seized from suspect during routine beat patrolling.", act: "NDPS", sec: 420, subHead: 3, majorHead: 3, category: 1, gravity: 1 },
]

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  console.log('Seeding 1,000+ records in Karnataka Police Department Database (26 ER Tables)...')

  // Clear existing data in reverse dependency order
  await prisma.chargesheetDetails.deleteMany()
  await prisma.arrestSurrender.deleteMany()
  await prisma.actSectionAssociation.deleteMany()
  await prisma.accused.deleteMany()
  await prisma.victim.deleteMany()
  await prisma.complainantDetails.deleteMany()
  await prisma.caseMaster.deleteMany()
  await prisma.crimeHeadActSection.deleteMany()
  await prisma.section.deleteMany()
  await prisma.act.deleteMany()
  await prisma.crimeSubHead.deleteMany()
  await prisma.crimeHead.deleteMany()
  await prisma.caseStatusMaster.deleteMany()
  await prisma.gravityOffence.deleteMany()
  await prisma.caseCategory.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.designation.deleteMany()
  await prisma.rank.deleteMany()
  await prisma.court.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.unitType.deleteMany()
  await prisma.district.deleteMany()
  await prisma.state.deleteMany()
  await prisma.casteMaster.deleteMany()
  await prisma.religionMaster.deleteMany()
  await prisma.occupationMaster.deleteMany()

  // 1. State & District
  const karnataka = await prisma.state.create({
    data: { StateID: 1, StateName: 'Karnataka', NationalityID: 1, Active: true },
  })
  const blrUrban = await prisma.district.create({
    data: { DistrictID: 44, DistrictName: 'Bangalore Urban', StateID: karnataka.StateID, Active: true },
  })

  // 2. Unit Types & Police Stations
  const psType = await prisma.unitType.create({
    data: { UnitTypeID: 1, UnitTypeName: 'Police Station', CityDistState: 'City', Hierarchy: 1, Active: true },
  })

  const stationsData = [
    { UnitID: 6201, UnitName: 'Whitefield Police Station' },
    { UnitID: 6202, UnitName: 'Koramangala Police Station' },
    { UnitID: 6203, UnitName: 'Indiranagar Police Station' },
    { UnitID: 6204, UnitName: 'HSR Layout Police Station' },
    { UnitID: 6205, UnitName: 'JP Nagar Police Station' },
    { UnitID: 6206, UnitName: 'BTM Layout Police Station' },
    { UnitID: 6207, UnitName: 'Marathahalli Police Station' },
    { UnitID: 6208, UnitName: 'Electronic City Police Station' },
    { UnitID: 6209, UnitName: 'Sarjapur Road Police Station' },
    { UnitID: 6210, UnitName: 'Rajajinagar Police Station' },
  ]

  for (const st of stationsData) {
    await prisma.unit.create({
      data: {
        UnitID: st.UnitID,
        UnitName: st.UnitName,
        TypeID: psType.UnitTypeID,
        StateID: karnataka.StateID,
        DistrictID: blrUrban.DistrictID,
        Active: true,
      },
    })
  }

  // 3. Ranks & Designations
  const rankInsp = await prisma.rank.create({ data: { RankID: 1, RankName: 'Inspector', Hierarchy: 1 } })
  const rankSI = await prisma.rank.create({ data: { RankID: 2, RankName: 'Sub-Inspector', Hierarchy: 2 } })
  const desigIO = await prisma.designation.create({ data: { DesignationID: 1, DesignationName: 'Investigating Officer' } })
  const desigSHO = await prisma.designation.create({ data: { DesignationID: 2, DesignationName: 'Station House Officer' } })

  // 4. Employees (20 Officers)
  const officerIds: number[] = []
  for (let o = 101; o <= 120; o++) {
    const fn = getRandomItem(FIRST_NAMES)
    const ln = getRandomItem(LAST_NAMES)
    const stId = 6201 + ((o - 101) % 10)
    await prisma.employee.create({
      data: {
        EmployeeID: o,
        KGID: `KGID-2018-0${o}`,
        FirstName: `Inspector ${fn} ${ln}`,
        DistrictID: blrUrban.DistrictID,
        UnitID: stId,
        RankID: o % 2 === 0 ? rankInsp.RankID : rankSI.RankID,
        DesignationID: o % 2 === 0 ? desigSHO.DesignationID : desigIO.DesignationID,
      },
    })
    officerIds.push(o)
  }

  // 5. Masters: CaseStatus, CaseCategory, Gravity, CrimeHeads, Acts, Sections
  const statusOpen = await prisma.caseStatusMaster.create({ data: { CaseStatusID: 1, CaseStatusName: 'Open' } })
  const statusUnderInv = await prisma.caseStatusMaster.create({ data: { CaseStatusID: 2, CaseStatusName: 'Under Investigation' } })
  const statusCS = await prisma.caseStatusMaster.create({ data: { CaseStatusID: 3, CaseStatusName: 'Charge Sheeted' } })
  const statusClosed = await prisma.caseStatusMaster.create({ data: { CaseStatusID: 4, CaseStatusName: 'Closed' } })
  const statuses = [statusOpen, statusUnderInv, statusCS, statusClosed]

  const catFIR = await prisma.caseCategory.create({ data: { CaseCategoryID: 1, LookupValue: 'FIR' } })
  const gravHeinous = await prisma.gravityOffence.create({ data: { GravityOffenceID: 1, LookupValue: 'Heinous' } })
  const gravNonHeinous = await prisma.gravityOffence.create({ data: { GravityOffenceID: 2, LookupValue: 'Non-Heinous' } })

  const headProp = await prisma.crimeHead.create({ data: { CrimeHeadID: 1, CrimeGroupName: 'Property Crimes' } })
  const headBody = await prisma.crimeHead.create({ data: { CrimeHeadID: 2, CrimeGroupName: 'Crimes Against Body' } })
  const headCyber = await prisma.crimeHead.create({ data: { CrimeHeadID: 3, CrimeGroupName: 'Financial & Cyber Crime' } })

  await prisma.crimeSubHead.create({ data: { CrimeSubHeadID: 1, CrimeHeadID: headProp.CrimeHeadID, CrimeHeadName: 'Theft' } })
  await prisma.crimeSubHead.create({ data: { CrimeSubHeadID: 2, CrimeHeadID: headProp.CrimeHeadID, CrimeHeadName: 'Burglary' } })
  await prisma.crimeSubHead.create({ data: { CrimeSubHeadID: 3, CrimeHeadID: headCyber.CrimeHeadID, CrimeHeadName: 'Cyber Fraud' } })
  await prisma.crimeSubHead.create({ data: { CrimeSubHeadID: 4, CrimeHeadID: headProp.CrimeHeadID, CrimeHeadName: 'Robbery' } })
  await prisma.crimeSubHead.create({ data: { CrimeSubHeadID: 5, CrimeHeadID: headBody.CrimeHeadID, CrimeHeadName: 'Murder' } })

  const actIPC = await prisma.act.create({ data: { ActCode: 'IPC', ActDescription: 'Indian Penal Code' } })
  const actIT = await prisma.act.create({ data: { ActCode: 'IT_ACT', ActDescription: 'Information Technology Act' } })
  const actNDPS = await prisma.act.create({ data: { ActCode: 'NDPS', ActDescription: 'Narcotic Drugs & Psychotropic Substances' } })

  const sec379 = await prisma.section.create({ data: { SectionID: 379, ActCode: actIPC.ActCode, SectionCode: '379', SectionDescription: 'Punishment for theft' } })
  const sec302 = await prisma.section.create({ data: { SectionID: 302, ActCode: actIPC.ActCode, SectionCode: '302', SectionDescription: 'Punishment for murder' } })
  const sec420 = await prisma.section.create({ data: { SectionID: 420, ActCode: actIPC.ActCode, SectionCode: '420', SectionDescription: 'Cheating & dishonesty' } })
  const sec66D = await prisma.section.create({ data: { SectionID: 66, ActCode: actIT.ActCode, SectionCode: '66D', SectionDescription: 'Cyber fraud by personation' } })

  const courtBlr = await prisma.court.create({ data: { CourtID: 1, DistrictID: blrUrban.DistrictID, StateID: karnataka.StateID, CourtName: 'City Civil & Sessions Court, Bangalore' } })
  const occ1 = await prisma.occupationMaster.create({ data: { OccupationID: 1, OccupationName: 'Private Employee' } })
  const rel1 = await prisma.religionMaster.create({ data: { ReligionID: 1, ReligionName: 'Hindu' } })
  const cas1 = await prisma.casteMaster.create({ data: { caste_master_id: 1, caste_master_name: 'General' } })

  // 6. Generate 1,050 CaseMaster Records
  const TOTAL_CASES = 1050
  console.log(`Generating ${TOTAL_CASES} CaseMaster records with full relational data...`)

  const nowMs = Date.now()
  const yearInMs = 365 * 24 * 3600 * 1000

  for (let i = 1; i <= TOTAL_CASES; i++) {
    const crime = getRandomItem(CRIME_FACTS)
    const stId = 6201 + ((i - 1) % 10)
    const offId = getRandomItem(officerIds)
    const statusObj = getRandomItem(statuses)
    const regDate = new Date(nowMs - Math.floor(Math.random() * yearInMs))

    const crimeNoStr = `10443000${stId}2026${String(i).padStart(5, '0')}`
    const caseNoStr = `2026${String(i).padStart(5, '0')}`

    const complainantName = `Sri. ${getRandomItem(FIRST_NAMES)} ${getRandomItem(LAST_NAMES)}`
    const victimName = `Sri. ${getRandomItem(FIRST_NAMES)} ${getRandomItem(LAST_NAMES)}`
    const accusedName = `${getRandomItem(FIRST_NAMES)} ${getRandomItem(LAST_NAMES)} (A1)`

    const caseRec = await prisma.caseMaster.create({
      data: {
        CaseMasterID: i,
        CrimeNo: crimeNoStr,
        CaseNo: caseNoStr,
        CrimeRegisteredDate: regDate,
        PolicePersonID: offId,
        PoliceStationID: stId,
        CaseCategoryID: catFIR.CaseCategoryID,
        GravityOffenceID: crime.gravity,
        CrimeMajorHeadID: crime.majorHead,
        CrimeMinorHeadID: crime.subHead,
        CaseStatusID: statusObj.CaseStatusID,
        CourtID: courtBlr.CourtID,
        IncidentFromDate: new Date(regDate.getTime() - 24 * 3600 * 1000),
        BriefFacts: crime.facts,
        latitude: 12.91 + (Math.random() * 0.1),
        longitude: 77.55 + (Math.random() * 0.2),
      },
    })

    // Complainant
    await prisma.complainantDetails.create({
      data: {
        ComplainantID: i,
        CaseMasterID: caseRec.CaseMasterID,
        ComplainantName: complainantName,
        AgeYear: 21 + (i % 45),
        GenderID: (i % 2) + 1,
        OccupationID: occ1.OccupationID,
        ReligionID: rel1.ReligionID,
        CasteID: cas1.caste_master_id,
      },
    })

    // Victim
    await prisma.victim.create({
      data: {
        VictimMasterID: i,
        CaseMasterID: caseRec.CaseMasterID,
        VictimName: victimName,
        AgeYear: 18 + (i % 50),
        GenderID: (i % 2) + 1,
        VictimPolice: '0',
      },
    })

    // Accused
    const accusedRec = await prisma.accused.create({
      data: {
        AccusedMasterID: i,
        CaseMasterID: caseRec.CaseMasterID,
        AccusedName: accusedName,
        AgeYear: 20 + (i % 35),
        GenderID: 1,
        PersonID: `A${i}`,
      },
    })

    // Act Section Association
    await prisma.actSectionAssociation.create({
      data: {
        CaseMasterID: caseRec.CaseMasterID,
        ActID: crime.act,
        SectionID: crime.sec,
      },
    })

    // Arrest if Charge Sheeted or Under Investigation
    if (statusObj.CaseStatusID === statusCS.CaseStatusID || statusObj.CaseStatusID === statusUnderInv.CaseStatusID) {
      await prisma.arrestSurrender.create({
        data: {
          ArrestSurrenderID: i,
          CaseMasterID: caseRec.CaseMasterID,
          ArrestSurrenderTypeID: 1,
          ArrestSurrenderDate: regDate,
          PoliceStationID: stId,
          IOID: offId,
          CourtID: courtBlr.CourtID,
          AccusedMasterID: accusedRec.AccusedMasterID,
          IsAccused: true,
        },
      })
    }

    // Chargesheet if Charge Sheeted
    if (statusObj.CaseStatusID === statusCS.CaseStatusID) {
      await prisma.chargesheetDetails.create({
        data: {
          CSID: i,
          CaseMasterID: caseRec.CaseMasterID,
          csdate: regDate,
          cstype: 'A',
          PolicePersonID: offId,
        },
      })
    }

    if (i % 250 === 0) {
      console.log(`Seeded ${i} / ${TOTAL_CASES} cases...`)
    }
  }

  console.log(`Successfully seeded ${TOTAL_CASES} FIR cases across all 26 ER tables!`)
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

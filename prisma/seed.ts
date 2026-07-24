import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning existing data...')
  await prisma.chargesheetDetails.deleteMany({})
  await prisma.arrestSurrender.deleteMany({})
  await prisma.actSectionAssociation.deleteMany({})
  await prisma.complainantDetails.deleteMany({})
  await prisma.victim.deleteMany({})
  await prisma.accused.deleteMany({})
  await prisma.caseMaster.deleteMany({})
  await prisma.crimeHeadActSection.deleteMany({})
  await prisma.section.deleteMany({})
  await prisma.act.deleteMany({})
  await prisma.crimeSubHead.deleteMany({})
  await prisma.crimeHead.deleteMany({})
  await prisma.casteMaster.deleteMany({})
  await prisma.religionMaster.deleteMany({})
  await prisma.occupationMaster.deleteMany({})
  await prisma.caseStatusMaster.deleteMany({})
  await prisma.caseCategory.deleteMany({})
  await prisma.gravityOffence.deleteMany({})
  await prisma.court.deleteMany({})
  await prisma.employee.deleteMany({})
  await prisma.designation.deleteMany({})
  await prisma.rank.deleteMany({})
  await prisma.unit.deleteMany({})
  await prisma.unitType.deleteMany({})
  await prisma.district.deleteMany({})
  await prisma.state.deleteMany({})

  console.log('Seeding Master Data...')

  // 1. State & District
  const karnataka = await prisma.state.create({
    data: { StateName: 'Karnataka', NationalityID: 1, Active: true }
  })

  const blrUrban = await prisma.district.create({
    data: { DistrictName: 'Bengaluru Urban', StateID: karnataka.StateID, Active: true }
  })
  const blrRural = await prisma.district.create({
    data: { DistrictName: 'Bengaluru Rural', StateID: karnataka.StateID, Active: true }
  })
  const mysuru = await prisma.district.create({
    data: { DistrictName: 'Mysuru', StateID: karnataka.StateID, Active: true }
  })

  // 2. UnitType & Units (Police Stations)
  const psUnitType = await prisma.unitType.create({
    data: { UnitTypeName: 'Police Station', CityDistState: 'City', Hierarchy: 1, Active: true }
  })

  const stationData = [
    { name: 'Whitefield Police Station', area: 'Whitefield' },
    { name: 'Indiranagar Police Station', area: 'Indiranagar' },
    { name: 'Koramangala Police Station', area: 'Koramangala' },
    { name: 'HSR Layout Police Station', area: 'HSR Layout' },
    { name: 'JP Nagar Police Station', area: 'JP Nagar' },
    { name: 'BTM Layout Police Station', area: 'BTM Layout' },
    { name: 'Marathahalli Police Station', area: 'Marathahalli' },
    { name: 'Electronic City Police Station', area: 'Electronic City' },
    { name: 'Sarjapur Road Police Station', area: 'Sarjapur Road' },
    { name: 'Rajajinagar Police Station', area: 'Rajajinagar' },
  ]

  const units: any[] = []
  for (const s of stationData) {
    const unit = await prisma.unit.create({
      data: {
        UnitName: s.name,
        TypeID: psUnitType.UnitTypeID,
        StateID: karnataka.StateID,
        DistrictID: blrUrban.DistrictID,
        Active: true
      }
    })
    units.push({ ...unit, area: s.area })
  }

  // 3. Ranks & Designations
  const rankInsp = await prisma.rank.create({ data: { RankName: 'Inspector', Hierarchy: 3 } })
  const rankSI = await prisma.rank.create({ data: { RankName: 'Sub-Inspector', Hierarchy: 4 } })

  const desigIO = await prisma.designation.create({ data: { DesignationName: 'Investigating Officer', SortOrder: 1 } })
  const desigSHO = await prisma.designation.create({ data: { DesignationName: 'Station House Officer', SortOrder: 2 } })

  // 4. Employees (Officers with KGID)
  const officerNames = [
    'Ravi Kumar', 'Priya Sharma', 'Anand Reddy', 'Sunita Devi', 'Mohammed Irfan',
    'Lakshmi Naidu', 'Venkatesh Gowda', 'Kavitha Rao', 'Suresh Babu', 'Deepa Mary',
    'Naveen Kumar', 'Geetha Lakshmi', 'Arun Prasad', 'Bhagya Sri', 'Rajesh M',
    'Pavithra K', 'Krishna Murthy', 'Anjali Gupta', 'Manoj Tiwari', 'Rekha S'
  ]

  const employees: any[] = []
  for (let i = 0; i < officerNames.length; i++) {
    const unit = units[i % units.length]
    const emp = await prisma.employee.create({
      data: {
        KGID: `KGID-2021-${(i + 1).toString().padStart(3, '0')}`,
        FirstName: officerNames[i],
        DistrictID: blrUrban.DistrictID,
        UnitID: unit.UnitID,
        RankID: i % 2 === 0 ? rankInsp.RankID : rankSI.RankID,
        DesignationID: i % 2 === 0 ? desigSHO.DesignationID : desigIO.DesignationID,
        GenderID: i % 2 === 0 ? 1 : 2,
        AppointmentDate: new Date(2015, (i % 12), 15)
      }
    })
    employees.push(emp)
  }

  // 5. Courts
  const court1 = await prisma.court.create({ data: { CourtName: '1st ACMM Court Bengaluru', DistrictID: blrUrban.DistrictID, StateID: karnataka.StateID } })
  const court2 = await prisma.court.create({ data: { CourtName: 'City Civil and Sessions Court Bengaluru', DistrictID: blrUrban.DistrictID, StateID: karnataka.StateID } })

  // 6. CaseCategory & GravityOffence
  const catFIR = await prisma.caseCategory.create({ data: { LookupValue: 'FIR' } })
  const catUDR = await prisma.caseCategory.create({ data: { LookupValue: 'UDR' } })
  const catZero = await prisma.caseCategory.create({ data: { LookupValue: 'Zero FIR' } })

  const gravHeinous = await prisma.gravityOffence.create({ data: { LookupValue: 'Heinous' } })
  const gravNonHeinous = await prisma.gravityOffence.create({ data: { LookupValue: 'Non-Heinous' } })

  // 7. CaseStatusMaster
  const statusOpen = await prisma.caseStatusMaster.create({ data: { CaseStatusName: 'Open' } })
  const statusInv = await prisma.caseStatusMaster.create({ data: { CaseStatusName: 'Under Investigation' } })
  const statusClosed = await prisma.caseStatusMaster.create({ data: { CaseStatusName: 'Closed' } })
  const statusCS = await prisma.caseStatusMaster.create({ data: { CaseStatusName: 'Charge Sheeted' } })

  const statuses = [statusOpen, statusInv, statusClosed, statusCS]

  // 8. Masters (Caste, Religion, Occupation)
  const casteOBC = await prisma.casteMaster.create({ data: { caste_master_name: 'General / Unreserved' } })
  const relHindu = await prisma.religionMaster.create({ data: { ReligionName: 'Hindu' } })
  const relMuslim = await prisma.religionMaster.create({ data: { ReligionName: 'Muslim' } })
  const relChristian = await prisma.religionMaster.create({ data: { ReligionName: 'Christian' } })
  const religions = [relHindu, relMuslim, relChristian]

  const occPvt = await prisma.occupationMaster.create({ data: { OccupationName: 'Private Employee / IT Professional' } })
  const occBiz = await prisma.occupationMaster.create({ data: { OccupationName: 'Business / Shop Owner' } })

  // 9. Acts & Sections
  const actIPC = await prisma.act.create({
    data: { ActCode: 'IPC', ActDescription: 'Indian Penal Code 1860', ShortName: 'IPC' }
  })
  const actIT = await prisma.act.create({
    data: { ActCode: 'IT_ACT', ActDescription: 'Information Technology Act 2000', ShortName: 'IT Act' }
  })

  const sec302 = await prisma.section.create({
    data: { ActCode: actIPC.ActCode, SectionCode: '302', SectionDescription: 'Punishment for murder' }
  })
  const sec379 = await prisma.section.create({
    data: { ActCode: actIPC.ActCode, SectionCode: '379', SectionDescription: 'Punishment for theft' }
  })
  const sec380 = await prisma.section.create({
    data: { ActCode: actIPC.ActCode, SectionCode: '380', SectionDescription: 'Theft in dwelling house' }
  })
  const sec420 = await prisma.section.create({
    data: { ActCode: actIPC.ActCode, SectionCode: '420', SectionDescription: 'Cheating and dishonestly inducing delivery of property' }
  })
  const sec66D = await prisma.section.create({
    data: { ActCode: actIT.ActCode, SectionCode: '66D', SectionDescription: 'Punishment for cheating by personation by using computer resource' }
  })

  // 10. CrimeHead & CrimeSubHead
  const headProperty = await prisma.crimeHead.create({ data: { CrimeGroupName: 'Property Crime' } })
  const headViolent = await prisma.crimeHead.create({ data: { CrimeGroupName: 'Violent Crime' } })
  const headCyber = await prisma.crimeHead.create({ data: { CrimeGroupName: 'Cyber Crime' } })
  const headFraud = await prisma.crimeHead.create({ data: { CrimeGroupName: 'Fraud' } })

  const subTheft = await prisma.crimeSubHead.create({ data: { CrimeHeadID: headProperty.CrimeHeadID, CrimeHeadName: 'Theft', SeqID: 1 } })
  const subBurglary = await prisma.crimeSubHead.create({ data: { CrimeHeadID: headProperty.CrimeHeadID, CrimeHeadName: 'Burglary', SeqID: 2 } })
  const subMurder = await prisma.crimeSubHead.create({ data: { CrimeHeadID: headViolent.CrimeHeadID, CrimeHeadName: 'Murder', SeqID: 3 } })
  const subRobbery = await prisma.crimeSubHead.create({ data: { CrimeHeadID: headViolent.CrimeHeadID, CrimeHeadName: 'Robbery', SeqID: 4 } })
  const subOnlineFraud = await prisma.crimeSubHead.create({ data: { CrimeHeadID: headCyber.CrimeHeadID, CrimeHeadName: 'Online Financial Fraud', SeqID: 5 } })
  const subCheating = await prisma.crimeSubHead.create({ data: { CrimeHeadID: headFraud.CrimeHeadID, CrimeHeadName: 'Cheating', SeqID: 6 } })

  const subHeads = [subTheft, subBurglary, subMurder, subRobbery, subOnlineFraud, subCheating]

  // Link CrimeHeadActSection
  await prisma.crimeHeadActSection.create({
    data: { CrimeHeadID: headProperty.CrimeHeadID, ActCode: actIPC.ActCode, SectionCode: '379' }
  })
  await prisma.crimeHeadActSection.create({
    data: { CrimeHeadID: headCyber.CrimeHeadID, ActCode: actIT.ActCode, SectionCode: '66D' }
  })

  console.log('Generating 500 CaseMaster records with child records...')

  const locationsMap: Record<string, { lat: number; lng: number; spots: string[] }> = {
    'Whitefield': { lat: 12.9698, lng: 77.7499, spots: ['ITPL Main Road', 'Hope Farm Circle', 'EPIP Zone', 'Vydehi Circle'] },
    'Indiranagar': { lat: 12.9784, lng: 77.6408, spots: ['100 Feet Road', 'CMH Road', 'HAL 2nd Stage', 'Defence Colony'] },
    'Koramangala': { lat: 12.9352, lng: 77.6245, spots: ['5th Block', '80 Feet Road', '4th Block Circle', 'Sony World Signal'] },
    'HSR Layout': { lat: 12.9121, lng: 77.6446, spots: ['Sector 1 Main Road', 'Sector 2', 'Agara Flyover', '27th Main'] },
    'JP Nagar': { lat: 12.9077, lng: 77.5854, spots: ['1st Phase', '6th Phase Circle', 'Sarakki Main Road', 'Puttenahalli'] },
    'BTM Layout': { lat: 12.9166, lng: 77.6101, spots: ['2nd Stage Bus Stand', 'Udupi Garden Signal', 'Mico Layout', '16th Main'] },
    'Marathahalli': { lat: 12.9591, lng: 77.6974, spots: ['Marathahalli Bridge', 'Kundanahalli Gate', 'Multiplex Road', 'AECS Layout'] },
    'Electronic City': { lat: 12.8452, lng: 77.6602, spots: ['Phase 1 Wipro Gate', 'Neeladri Nagar', 'Hosur Main Road', 'Phase 2 Flyover'] },
    'Sarjapur Road': { lat: 12.9237, lng: 77.6705, spots: ['Kaikondrahalli Lake', 'Bellandur Gate', 'Harlur Road', 'Carmelaram'] },
    'Rajajinagar': { lat: 12.9882, lng: 77.5548, spots: ['1st Block', 'Navrang Theatre Circle', 'West of Chord Road', 'ESI Hospital Road'] },
  }

  const maleNames = ['Ramesh Kumar', 'Suresh Gowda', 'Mahesh Babu', 'Kiran Reddy', 'Vijay Prashanth', 'Arjun Singh', 'Sanjay Patel', 'Deepak Murthy']
  const femaleNames = ['Priya Sharma', 'Sunita Devi', 'Lakshmi Rao', 'Kavitha Naidu', 'Deepa Mary', 'Geetha Lakshmi', 'Anjali Gupta']

  const startDate = new Date(2025, 0, 1)
  const endDate = new Date(2026, 6, 20)

  for (let i = 1; i <= 500; i++) {
    const unit = units[i % units.length]
    const officer = employees[i % employees.length]
    const subHead = subHeads[i % subHeads.length]
    const status = statuses[i % statuses.length]
    const category = i % 10 === 0 ? catUDR : (i % 25 === 0 ? catZero : catFIR)
    const gravity = subHead.CrimeHeadName === 'Murder' || subHead.CrimeHeadName === 'Robbery' ? gravHeinous : gravNonHeinous

    const crimeNo = `${category.CaseCategoryID}${1044}${unit.UnitID.toString().padStart(4, '0')}${2026}${i.toString().padStart(5, '0')}`
    const caseNo = `2026${i.toString().padStart(5, '0')}`

    const filedDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()))
    const incidentDate = new Date(filedDate.getTime() - Math.floor(Math.random() * 86400000 * 3))

    const locInfo = locationsMap[unit.area] || { lat: 12.9716, lng: 77.5946, spots: ['Main Road'] }
    const spot = locInfo.spots[i % locInfo.spots.length]
    const lat = locInfo.lat + (Math.random() - 0.5) * 0.01
    const lng = locInfo.lng + (Math.random() - 0.5) * 0.01

    const caseObj = await prisma.caseMaster.create({
      data: {
        CrimeNo: crimeNo,
        CaseNo: caseNo,
        CrimeRegisteredDate: filedDate,
        PolicePersonID: officer.EmployeeID,
        PoliceStationID: unit.UnitID,
        CaseCategoryID: category.CaseCategoryID,
        GravityOffenceID: gravity.GravityOffenceID,
        CrimeMajorHeadID: subHead.CrimeHeadID,
        CrimeMinorHeadID: subHead.CrimeSubHeadID,
        CaseStatusID: status.CaseStatusID,
        CourtID: court1.CourtID,
        IncidentFromDate: incidentDate,
        IncidentToDate: incidentDate,
        InfoReceivedPSDate: filedDate,
        latitude: lat,
        longitude: lng,
        BriefFacts: `Incident of ${subHead.CrimeHeadName} reported near ${spot}, ${unit.area}. Complainant reported property loss / damage.`
      }
    })

    // Create Complainant
    await prisma.complainantDetails.create({
      data: {
        CaseMasterID: caseObj.CaseMasterID,
        ComplainantName: maleNames[i % maleNames.length],
        AgeYear: 25 + (i % 35),
        OccupationID: occPvt.OccupationID,
        ReligionID: religions[i % religions.length].ReligionID,
        CasteID: casteOBC.caste_master_id,
        GenderID: 1
      }
    })

    // Create Victim
    await prisma.victim.create({
      data: {
        CaseMasterID: caseObj.CaseMasterID,
        VictimName: femaleNames[i % femaleNames.length],
        AgeYear: 20 + (i % 30),
        GenderID: 2,
        VictimPolice: '0'
      }
    })

    // Create Accused if applicable
    if (status.CaseStatusName !== 'Open') {
      const accusedObj = await prisma.accused.create({
        data: {
          CaseMasterID: caseObj.CaseMasterID,
          AccusedName: maleNames[(i + 3) % maleNames.length],
          AgeYear: 22 + (i % 25),
          GenderID: 1,
          PersonID: `A${i}`
        }
      })

      // Create Arrest record if Charge Sheeted or Closed
      if (status.CaseStatusName === 'Charge Sheeted' || status.CaseStatusName === 'Closed') {
        await prisma.arrestSurrender.create({
          data: {
            CaseMasterID: caseObj.CaseMasterID,
            ArrestSurrenderDate: new Date(filedDate.getTime() + 86400000 * 5),
            PoliceStationID: unit.UnitID,
            IOID: officer.EmployeeID,
            CourtID: court1.CourtID,
            AccusedMasterID: accusedObj.AccusedMasterID,
            IsAccused: true
          }
        })

        await prisma.chargesheetDetails.create({
          data: {
            CaseMasterID: caseObj.CaseMasterID,
            csdate: new Date(filedDate.getTime() + 86400000 * 15),
            cstype: 'A',
            PolicePersonID: officer.EmployeeID
          }
        })
      }
    }

    // Create ActSectionAssociation
    const secToUse = subHead.CrimeHeadName === 'Murder' ? sec302 : (subHead.CrimeHeadName === 'Online Financial Fraud' ? sec66D : sec379)
    await prisma.actSectionAssociation.create({
      data: {
        CaseMasterID: caseObj.CaseMasterID,
        ActID: secToUse.ActCode,
        SectionID: secToUse.id,
        ActOrderID: 1,
        SectionOrderID: 1
      }
    })
  }

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

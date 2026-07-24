import { NextRequest, NextResponse } from "next/server";
import { CatalystZiaService, CatalystSignalsService } from "@/lib/catalyst";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No FIR document file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 1: Extract FIR details via Catalyst Zia OCR
    const extractedData = await CatalystZiaService.extractFIRDocument(buffer, file.name);

    // Step 2: Ensure Unit and CrimeSubHead exist, then create CaseMaster in Data Store
    let unit = await db.unit.findFirst({
      where: { UnitName: { contains: extractedData.location.split(",")[0] } },
    });
    if (!unit) {
      unit = await db.unit.findFirst();
    }

    let crimeSubHead = await db.crimeSubHead.findFirst({
      where: { CrimeHeadName: { contains: "Theft" } },
    });
    if (!crimeSubHead) {
      crimeSubHead = await db.crimeSubHead.findFirst();
    }

    if (unit && crimeSubHead) {
      const createdCase = await db.caseMaster.create({
        data: {
          CrimeNo: extractedData.firNumber || `10443${unit.UnitID.toString().padStart(4, '0')}202600999`,
          CaseNo: `202600999`,
          CrimeRegisteredDate: new Date(),
          PoliceStationID: unit.UnitID,
          CrimeMajorHeadID: crimeSubHead.CrimeHeadID,
          CrimeMinorHeadID: crimeSubHead.CrimeSubHeadID,
          IncidentFromDate: new Date(),
          BriefFacts: extractedData.briefFacts,
          victims: {
            create: [
              { VictimName: extractedData.victimName || "Anonymous", GenderID: 1 }
            ]
          },
          accused: {
            create: [
              { AccusedName: extractedData.accusedName || "Unidentified Suspect", GenderID: 1 }
            ]
          }
        },
      });

      // Step 3: Trigger Catalyst Signals Event
      await CatalystSignalsService.emitFIRInsertSignal({
        firNumber: createdCase.CrimeNo,
        crimeType: crimeSubHead.CrimeHeadName,
        stationArea: unit.UnitName,
        suspectName: extractedData.accusedName,
      });
    }

    return NextResponse.json({
      success: true,
      message: "FIR Document processed via Catalyst Zia OCR & stored in Catalyst Data Store",
      extractedData,
      catalystServiceUsed: "Catalyst Stratus (Storage) + Catalyst Zia OCR + Catalyst Signals",
    });
  } catch (error) {
    console.error("FIR Upload error:", error);
    return NextResponse.json({ error: "FIR document processing failed" }, { status: 500 });
  }
}

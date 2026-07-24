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

    // Step 2: Ensure CrimeType and PoliceStation exist, then create Case in Data Store
    let station = await db.policeStation.findFirst({
      where: { area: { contains: extractedData.location.split(",")[0] } },
    });
    if (!station) {
      station = await db.policeStation.findFirst();
    }

    let crimeType = await db.crimeType.findFirst({
      where: { name: { contains: "Theft" } },
    });
    if (!crimeType) {
      crimeType = await db.crimeType.findFirst();
    }

    if (station && crimeType) {
      const createdCase = await db.case.create({
        data: {
          firNumber: extractedData.firNumber,
          crimeTypeId: crimeType.id,
          stationId: station.id,
          status: "Open",
          priority: "High",
          filedDate: new Date(),
          incidentDate: new Date(),
          incidentTime: extractedData.incidentTime,
          description: extractedData.briefFacts,
          location: extractedData.location,
          victimName: extractedData.victimName,
          suspectName: extractedData.accusedName,
        },
      });

      // Step 3: Trigger Catalyst Signals Event
      await CatalystSignalsService.emitFIRInsertSignal({
        firNumber: createdCase.firNumber,
        crimeType: crimeType.name,
        stationArea: station.area,
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

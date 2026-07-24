-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtCode" TEXT NOT NULL,
    "districtName" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    CONSTRAINT "District_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnitType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "typeName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitCode" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Unit_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Unit_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rankName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Designation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "designationName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rankId" TEXT NOT NULL,
    "designationId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "dateOfJoining" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employee_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Employee_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Employee_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Act" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actCode" TEXT NOT NULL,
    "actName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionCode" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "isBailable" BOOLEAN NOT NULL DEFAULT true,
    "isCognizable" BOOLEAN NOT NULL DEFAULT true,
    "actId" TEXT NOT NULL,
    CONSTRAINT "Section_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrimeHead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crimeHeadCode" TEXT NOT NULL,
    "crimeHeadName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CrimeSubHead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subHeadCode" TEXT NOT NULL,
    "subHeadName" TEXT NOT NULL,
    "crimeHeadId" TEXT NOT NULL,
    CONSTRAINT "CrimeSubHead_crimeHeadId_fkey" FOREIGN KEY ("crimeHeadId") REFERENCES "CrimeHead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrimeHeadActSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crimeHeadId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "actId" TEXT NOT NULL,
    CONSTRAINT "CrimeHeadActSection_crimeHeadId_fkey" FOREIGN KEY ("crimeHeadId") REFERENCES "CrimeHead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrimeHeadActSection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrimeHeadActSection_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryCode" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CaseStatusMaster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statusCode" TEXT NOT NULL,
    "statusName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GravityOffence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gravityCode" TEXT NOT NULL,
    "gravityName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courtCode" TEXT NOT NULL,
    "courtName" TEXT NOT NULL,
    "courtType" TEXT NOT NULL,
    "address" TEXT
);

-- CreateTable
CREATE TABLE "CasteMaster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "casteCode" TEXT NOT NULL,
    "casteName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ReligionMaster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "religionCode" TEXT NOT NULL,
    "religionName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "OccupationMaster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "occupationCode" TEXT NOT NULL,
    "occupationName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CaseMaster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crimeNo" TEXT NOT NULL,
    "firNumber" TEXT NOT NULL,
    "crimeHeadId" TEXT NOT NULL,
    "crimeSubHeadId" TEXT,
    "caseCategoryId" TEXT NOT NULL,
    "caseStatusId" TEXT NOT NULL,
    "gravityId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "investigatingOfficerId" TEXT,
    "firDate" DATETIME NOT NULL,
    "incidentDate" DATETIME NOT NULL,
    "incidentTime" TEXT,
    "detectionDate" DATETIME,
    "arrestDate" DATETIME,
    "chargesheetDate" DATETIME,
    "location" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "gpsCoordinates" TEXT,
    "briefFacts" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaseMaster_crimeHeadId_fkey" FOREIGN KEY ("crimeHeadId") REFERENCES "CrimeHead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseMaster_crimeSubHeadId_fkey" FOREIGN KEY ("crimeSubHeadId") REFERENCES "CrimeSubHead" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseMaster_caseCategoryId_fkey" FOREIGN KEY ("caseCategoryId") REFERENCES "CaseCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseMaster_caseStatusId_fkey" FOREIGN KEY ("caseStatusId") REFERENCES "CaseStatusMaster" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseMaster_gravityId_fkey" FOREIGN KEY ("gravityId") REFERENCES "GravityOffence" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseMaster_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseMaster_investigatingOfficerId_fkey" FOREIGN KEY ("investigatingOfficerId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Complainant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "casteId" TEXT,
    "religionId" TEXT,
    "occupationId" TEXT,
    "relationToVictim" TEXT,
    CONSTRAINT "Complainant_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseMaster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Complainant_casteId_fkey" FOREIGN KEY ("casteId") REFERENCES "CasteMaster" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Complainant_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "ReligionMaster" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Complainant_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "OccupationMaster" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Victim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "casteId" TEXT,
    "religionId" TEXT,
    "occupationId" TEXT,
    "injuryDetail" TEXT,
    CONSTRAINT "Victim_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseMaster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Victim_casteId_fkey" FOREIGN KEY ("casteId") REFERENCES "CasteMaster" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Victim_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "ReligionMaster" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Victim_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "OccupationMaster" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Accused" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "casteId" TEXT,
    "religionId" TEXT,
    "occupationId" TEXT,
    "arrestStatus" TEXT,
    CONSTRAINT "Accused_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseMaster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Accused_casteId_fkey" FOREIGN KEY ("casteId") REFERENCES "CasteMaster" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Accused_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "ReligionMaster" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Accused_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "OccupationMaster" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArrestSurrender" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accusedId" TEXT NOT NULL,
    "arrestType" TEXT NOT NULL,
    "arrestDate" DATETIME NOT NULL,
    "arrestingOfficer" TEXT,
    "remarks" TEXT,
    CONSTRAINT "ArrestSurrender_accusedId_fkey" FOREIGN KEY ("accusedId") REFERENCES "Accused" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActSectionAssociation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "actId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    CONSTRAINT "ActSectionAssociation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseMaster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActSectionAssociation_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActSectionAssociation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChargesheetDetails" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "filingDate" DATETIME NOT NULL,
    "chargesheetNumber" TEXT,
    "totalAccused" INTEGER NOT NULL,
    "status" TEXT,
    "remarks" TEXT,
    CONSTRAINT "ChargesheetDetails_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseMaster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChargesheetDetails_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QueryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "sqlQuery" TEXT NOT NULL,
    "sqlResult" TEXT,
    "answer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "State_stateCode_key" ON "State"("stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "District_districtCode_key" ON "District"("districtCode");

-- CreateIndex
CREATE UNIQUE INDEX "UnitType_typeName_key" ON "UnitType"("typeName");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_unitCode_key" ON "Unit"("unitCode");

-- CreateIndex
CREATE UNIQUE INDEX "Rank_rankName_key" ON "Rank"("rankName");

-- CreateIndex
CREATE UNIQUE INDEX "Designation_designationName_key" ON "Designation"("designationName");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Act_actCode_key" ON "Act"("actCode");

-- CreateIndex
CREATE UNIQUE INDEX "Section_sectionCode_key" ON "Section"("sectionCode");

-- CreateIndex
CREATE UNIQUE INDEX "CrimeHead_crimeHeadCode_key" ON "CrimeHead"("crimeHeadCode");

-- CreateIndex
CREATE UNIQUE INDEX "CrimeSubHead_subHeadCode_key" ON "CrimeSubHead"("subHeadCode");

-- CreateIndex
CREATE UNIQUE INDEX "CrimeHeadActSection_crimeHeadId_sectionId_actId_key" ON "CrimeHeadActSection"("crimeHeadId", "sectionId", "actId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseCategory_categoryCode_key" ON "CaseCategory"("categoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStatusMaster_statusCode_key" ON "CaseStatusMaster"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "GravityOffence_gravityCode_key" ON "GravityOffence"("gravityCode");

-- CreateIndex
CREATE UNIQUE INDEX "Court_courtCode_key" ON "Court"("courtCode");

-- CreateIndex
CREATE UNIQUE INDEX "CasteMaster_casteCode_key" ON "CasteMaster"("casteCode");

-- CreateIndex
CREATE UNIQUE INDEX "ReligionMaster_religionCode_key" ON "ReligionMaster"("religionCode");

-- CreateIndex
CREATE UNIQUE INDEX "OccupationMaster_occupationCode_key" ON "OccupationMaster"("occupationCode");

-- CreateIndex
CREATE UNIQUE INDEX "CaseMaster_crimeNo_key" ON "CaseMaster"("crimeNo");

-- CreateIndex
CREATE UNIQUE INDEX "ActSectionAssociation_caseId_actId_sectionId_key" ON "ActSectionAssociation"("caseId", "actId", "sectionId");

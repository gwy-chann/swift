package com.swift.modules.services.service;

import com.swift.modules.services.dto.*;

import java.util.List;

public interface LaborServiceManager {

    List<LaborServiceResponse> getLaborServices(Boolean active, String bay, String keyword);

    LaborServiceResponse getLaborServiceByIdOrCode(String identifier);

    LaborServiceResponse createLaborService(CreateLaborServiceRequest request);

    LaborServiceResponse updateLaborService(String identifier, UpdateLaborServiceRequest request);

    LaborServiceResponse updateLaborServiceStatus(String identifier, boolean active);

    void deleteLaborService(String identifier);

    List<ServiceRateAuditLogResponse> getRateAuditLogs(String serviceIdentifier);
}

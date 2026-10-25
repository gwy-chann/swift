package com.swift.modules.admin.service;

import com.swift.modules.admin.dto.*;

import java.util.List;
import java.util.UUID;

public interface UserAdminService {

    List<StaffUserResponse> listStaffUsers();

    StaffUserResponse getStaffUser(UUID id);

    StaffUserResponse provisionStaffUser(ProvisionStaffUserRequest request, UUID callerUserId, String callerEmail);

    StaffUserResponse updateStaffUser(UUID id, UpdateStaffUserRequest request, UUID callerUserId);

    StaffUserResponse updatePermissions(UUID id, UpdateUserPermissionsRequest request);

    StaffUserResponse updateStatus(UUID id, UpdateUserStatusRequest request, UUID callerUserId);

    StaffUserResponse resetCredentials(UUID id, ResetCredentialsRequest request, UUID callerUserId, String callerEmail);
}

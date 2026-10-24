package com.swift.modules.motomatcher.dto;

public record AddFitmentRuleResponse(
    boolean success,
    String ruleId,
    String error
) {
    public static AddFitmentRuleResponse ok(String ruleId) {
        return new AddFitmentRuleResponse(true, ruleId, null);
    }

    public static AddFitmentRuleResponse error(String error) {
        return new AddFitmentRuleResponse(false, null, error);
    }
}

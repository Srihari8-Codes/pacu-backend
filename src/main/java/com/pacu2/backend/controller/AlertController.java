package com.pacu2.backend.controller;

import com.pacu2.backend.entity.Alert;
import com.pacu2.backend.service.AlertService;
import org.springframework.beans.factory.annotation.Autowired; 
import org.springframework.web.bind.annotation.*;


import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    @Autowired
    private AlertService alertService;

    @GetMapping("/patient/{patientId}")
    public List<Alert> getAlertsByPatient(@PathVariable UUID patientId) {
        return alertService.getAlertsByPatient(patientId);
    }

    @GetMapping("/unresolved")
    public List<Alert> getUnresolvedAlerts() {
        return alertService.getUnresolvedAlerts();
    }
}

